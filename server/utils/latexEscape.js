/**
 * LaTeX escaping. This is the single most important file in the whole
 * pipeline: it's what guarantees Gemini's tailored text (which might contain
 * "%", "&", "$", "#", "_" from a job description or a C# skill, etc.)
 * NEVER breaks the LaTeX compile. The LLM never sees raw LaTeX syntax --
 * it only ever produces plain text, and this function is the only thing
 * that turns plain text into safe LaTeX.
 *
 * Order matters: backslash must be escaped FIRST, or you'll double-escape
 * the backslashes you just introduced for the other characters.
 */
function escapeLatex(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

/** Escapes every string value in an object/array recursively -- convenient
 * for running over a whole tailored-content JSON blob at once. */
function deepEscape(input) {
  if (typeof input === "string") return escapeLatex(input);
  if (Array.isArray(input)) return input.map(deepEscape);
  if (input && typeof input === "object") {
    const out = {};
    for (const [k, v] of Object.entries(input)) out[k] = deepEscape(v);
    return out;
  }
  return input;
}

module.exports = { escapeLatex, deepEscape };