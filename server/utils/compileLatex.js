const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);
const PDFS_DIR = path.join(__dirname, "../public/pdfs");
const COMPILE_TIMEOUT_MS = 60000; // 60s: first-time compiles on a fresh MiKTeX install may need to download several packages over the network (fontawesome5, FiraMono, etc.) -- 20s was killing the process mid-download. Once packages are cached locally, real compiles finish in 1-3s regardless of this ceiling.

/**
 * Compiles LaTeX source to PDF. Returns { pdfFileName, pdfPath }.
 * Throws with a readable error message (first real error line from the
 * .log) if compilation fails, and ALWAYS cleans up aux files whether it
 * succeeds or fails -- no more orphaned .aux/.log files piling up.
 */
async function compileLatex(latexSource) {
  await fs.ensureDir(PDFS_DIR);

  const id = crypto.randomUUID(); // no more Date.now() collisions under concurrent requests
  const baseName = `resume_${id}`;
  const texPath = path.join(PDFS_DIR, `${baseName}.tex`);
  const pdfPath = path.join(PDFS_DIR, `${baseName}.pdf`);
  const logPath = path.join(PDFS_DIR, `${baseName}.log`);

  await fs.writeFile(texPath, latexSource);

  try {
    await execAsync(
      `pdflatex -interaction=nonstopmode -halt-on-error -output-directory="${PDFS_DIR}" "${texPath}"`,
      { timeout: COMPILE_TIMEOUT_MS, maxBuffer: 1024 * 1024 * 10 }
    );
  } catch (err) {
    // ENOENT / "not recognized" means the pdflatex command itself couldn't
    // be found -- a missing LaTeX installation, not a syntax error in the
    // generated document. Surface that distinction clearly.
    console.error("STDOUT:", err.stdout);
    console.error("STDERR:", err.stderr);
    console.error(err);
    const notInstalled =
      err.code === "ENOENT" ||
      /is not recognized|command not found/i.test(err.message || "");
    if (notInstalled) {
      await cleanup(baseName, { keepTex: true, keepLog: true });
      throw new Error(
        "pdflatex is not installed or not on your system PATH. Install a LaTeX distribution " +
        "(MiKTeX on Windows: https://miktex.org/download, or TeX Live on Mac/Linux), " +
        "restart your terminal, and verify with `pdflatex --version`."
      );
    }

    // pdflatex exits non-zero on any error, including ones that still
    // produce a usable PDF (e.g. missing font warnings) -- so don't trust
    // the exit code alone, check whether a PDF actually came out.
    const pdfExists = await fs.pathExists(pdfPath);
    if (!pdfExists) {
      const reason = await extractLogError(logPath);
      // keep BOTH .tex and .log so the actual cause can be inspected --
      // previously the .log was deleted unconditionally here, which is
      // why past errors looked like "Unknown error" with nothing to check
      await cleanup(baseName, { keepTex: true, keepLog: true });
      throw new Error(`LaTeX compilation failed:\n${reason}`);
    }
  }

  const pdfExists = await fs.pathExists(pdfPath);
  if (!pdfExists) {
    await cleanup(baseName, { keepTex: true, keepLog: true });
    throw new Error("LaTeX compilation did not produce a PDF for an unknown reason.");
  }

  await cleanup(baseName, { keepTex: false, keepLog: false, keepPdf: true });
  return { pdfFileName: `${baseName}.pdf`, pdfPath };
}

/** Pulls useful error context out of pdflatex's .log. Most LaTeX errors
 * start with a line like "! Undefined control sequence." -- when found,
 * we return that line plus a few lines after it (which usually show
 * exactly which line of the generated .tex caused it). If no such line
 * exists (rare), we fall back to the last ~25 lines of the log, since
 * that's still far more useful than "unknown error". */
async function extractLogError(logPath) {
  try {
    const log = await fs.readFile(logPath, "utf8");
    const bangIndex = log.search(/^!.*$/m);
    if (bangIndex !== -1) {
      return log.slice(bangIndex, bangIndex + 600).trim();
    }
    const tail = log.trim().split("\n").slice(-25).join("\n");
    return `No "!" error marker found. Last part of the log:\n${tail}`;
  } catch {
    return "Compilation failed and no log file was produced.";
  }
}

async function cleanup(baseName, { keepTex = false, keepLog = false, keepPdf = false } = {}) {
  const exts = [".aux", ".out"];
  if (!keepTex) exts.push(".tex");
  if (!keepLog) exts.push(".log");
  if (!keepPdf) exts.push(".pdf");
  await Promise.all(
    exts.map((ext) => removeWithRetry(path.join(PDFS_DIR, `${baseName}${ext}`)))
  );
}

/**
 * Windows sometimes briefly holds a lock on a file right after the process
 * that wrote it (pdflatex) exits -- antivirus scanning it, a MiKTeX helper
 * process, Windows Search indexing, etc. Deleting it half a second later
 * almost always succeeds, so retry a few times with a short delay instead
 * of failing the whole request over a transient lock.
 */
async function removeWithRetry(filePath, attempts = 5, delayMs = 150) {
  for (let i = 0; i < attempts; i++) {
    try {
      await fs.remove(filePath);
      return;
    } catch (err) {
      const isLocked = err.code === "EBUSY" || err.code === "EPERM";
      if (!isLocked || i === attempts - 1) {
        if (isLocked) {
          // Not fatal -- an orphaned .log/.aux file is harmless clutter,
          // not a broken resume. Log it and move on rather than failing
          // the user's request over a leftover temp file.
          console.warn(`[compileLatex] Could not delete ${filePath} after ${attempts} attempts (still locked). Leaving it in place.`);
          return;
        }
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { compileLatex };