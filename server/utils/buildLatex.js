const { escapeLatex } = require("./latexEscape");

/**
 * Builds each LaTeX section from PLAIN TEXT content (never LaTeX syntax from
 * the model) using your existing classic.tex macros: \resumeSubheading,
 * \resumeSubheadingWithCGPA, \resumeProjectHeading, \resumeItem, etc.
 */

function formatDateRange(start, end) {
  const s = escapeLatex(start || "");
  const e = escapeLatex(end || "Present");
  if (!s && !e) return "";
  return `${s} -- ${e}`;
}

// ---------------------------------------------------------------------
// Contact line: built entirely in JS so a field can be structurally
// OMITTED (no icon, no leftover pipe) rather than just left blank.
// `omitFields` is an array of dot-paths like "personal.linkedin" --
// coming from the frontend when the user clicks "Ignore" on a missing
// field. Phone/Email/Location are always shown; LinkedIn/GitHub show
// "N/A" by default (so the Missing Information panel has something to
// detect and act on) unless explicitly omitted.
// ---------------------------------------------------------------------
function buildContactLine(personalInfo = {}, omitFields = []) {
  const isOmitted = (path) => omitFields.includes(path);
  const segments = [];

  if (personalInfo.phone) {
    segments.push(`\\faPhone* \\texttt{${escapeLatex(personalInfo.phone)}}`);
  }
  if (personalInfo.email) {
    segments.push(`\\faEnvelope \\hspace{2pt} \\texttt{${escapeLatex(personalInfo.email)}}`);
  }
  if (!isOmitted("personal.linkedin")) {
    segments.push(`\\faLinkedin \\hspace{2pt} \\texttt{${escapeLatex(personalInfo.linkedin || "N/A")}}`);
  }
  if (!isOmitted("personal.github")) {
    segments.push(`\\faGithub \\hspace{2pt} \\texttt{${escapeLatex(personalInfo.github || "N/A")}}`);
  }
  const location = personalInfo.country || personalInfo.location;
  if (location) {
    segments.push(`\\faMapMarker* \\hspace{2pt}\\texttt{${escapeLatex(location)}}`);
  }

  return segments.join(" \\hspace{1pt} $|$\n    \\hspace{1pt} ");
}

function buildSkillsBlock(skills = {}) {
  if (!skills || Object.keys(skills).length === 0) return "~ % Invisible space prevents crash";
  const lines = Object.entries(skills).map(([category, items]) => {
    const catEsc = escapeLatex(category);
    const itemsEsc = (items || []).map(escapeLatex).join(", ");
    return `    \\textbf{${catEsc}} {: ${itemsEsc}} \\vspace{2pt} \\\\`;
  });
  return lines.join("\n");
}

function buildBulletList(bullets = []) {
  if (!bullets || !bullets.length) return "";
  const items = bullets.map((b) => `        \\resumeItem{${escapeLatex(b)}}`).join("\n");
  return `    \\resumeItemListStart\n${items}\n    \\resumeItemListEnd`;
}

function buildExperienceBlock(experience = []) {
  if (!experience || experience.length === 0) return "    \\item ~ % Invisible space prevents crash";
  return experience
    .map((exp) => {
      const heading = `    \\resumeSubheading{${escapeLatex(exp.company)}}{${formatDateRange(exp.startDate, exp.endDate)}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.location || "")}}`;
      return `${heading}\n${buildBulletList(exp.bullets)}`;
    })
    .join("\n\n");
}

function buildProjectBlock(projects = []) {
  if (!projects || projects.length === 0) return "    \\item ~ % Invisible space prevents crash";
  return projects
    .map((proj) => {
      const title = `\\textbf{${escapeLatex(proj.title)}} $|$ \\emph{${escapeLatex(proj.techStack || "")}}`;
      const heading = `      \\resumeProjectHeading{${title}}{}`;
      return `${heading}\n${buildBulletList(proj.bullets)}`;
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------
// Education: when CGPA is missing, use the 4-argument \resumeSubheading
// macro instead of the 5-argument \resumeSubheadingWithCGPA -- this
// STRUCTURALLY removes the CGPA row (no blank line, no "N/A" text)
// rather than rendering an empty 5th argument. `omitFields` entries look
// like "education.<index>.cgpa".
// ---------------------------------------------------------------------
function buildEducationBlock(education = [], omitFields = []) {
  if (!education || education.length === 0) return "    \\item ~ % Invisible space prevents crash";
  return education
    .map((edu, idx) => {
      const cgpaOmitted = omitFields.includes(`education.${idx}.cgpa`);
      if (edu.cgpa && !cgpaOmitted) {
        const cgpaText = `CGPA: ${escapeLatex(edu.cgpa)}`;
        return `    \\resumeSubheadingWithCGPA{${escapeLatex(edu.institution)}}{${formatDateRange(edu.startDate, edu.endDate)}}{${escapeLatex(edu.degree)}}{${escapeLatex(edu.location || "")}}{${cgpaText}}`;
      }
      // No CGPA (or it was explicitly ignored) -- 4-arg macro, no CGPA row at all
      return `    \\resumeSubheading{${escapeLatex(edu.institution)}}{${formatDateRange(edu.startDate, edu.endDate)}}{${escapeLatex(edu.degree)}}{${escapeLatex(edu.location || "")}}`;
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------
// Certifications: each gets a clickable "Enroll" link. We deliberately
// link to a Google search for the cert name + issuer rather than trust
// the LLM to produce a real enrollment URL -- an invented URL that looks
// plausible but 404s is worse than a search result, same reasoning as
// the existing missingSkills -> YouTube-search pattern elsewhere in this
// codebase.
// ---------------------------------------------------------------------
function buildCertificationBlock(certifications = []) {
  if (!certifications || certifications.length === 0) return "    ~ % No certifications provided";
  return certifications
    .map((cert) => {
      const name = escapeLatex(cert.name);
      const issuer = cert.issuer ? ` {- ${escapeLatex(cert.issuer)}}` : "";
      const date = cert.date ? ` \\hfill ${escapeLatex(cert.date)}` : "";
      const searchQuery = encodeURIComponent(`${cert.name} ${cert.issuer || ""} enroll`.trim());
      const url = `https://www.google.com/search?q=${searchQuery}`;
      return `     \\href{${url}}{\\textbf{${name}}}${issuer}${date} \\\\[3pt]`;
    })
    .join("\n");
}

/**
 * Injects tailored content + the user's stable personal info into the raw
 * .tex template. `omitFields` is an array of dot-paths (e.g.
 * ["personal.linkedin", "education.0.cgpa"]) sent by the frontend when
 * the user clicks "Ignore" on a Missing Information item -- those fields
 * are structurally removed from the document rather than shown blank.
 */
function injectTemplate(rawTemplate, personalInfo, tailoredContent, omitFields = []) {
  const replacements = {
    "{{PERSONAL_NAME}}": escapeLatex(personalInfo.name),
    "{{CONTACT_LINE}}": buildContactLine(personalInfo, omitFields),
    "{{PROFESSIONAL_SUMMARY_TEXT}}": escapeLatex(tailoredContent.summary),
    "{{INSERT_SKILLS_BLOCK_HERE}}": buildSkillsBlock(tailoredContent.skills),
    "{{INSERT_EXPERIENCE_BLOCKS_HERE}}": buildExperienceBlock(tailoredContent.experience),
    "{{INSERT_PROJECT_BLOCKS_HERE}}": buildProjectBlock(tailoredContent.projects),
    "{{INSERT_EDUCATION_BLOCKS_HERE}}": buildEducationBlock(tailoredContent.education, omitFields),
    "{{INSERT_CERTIFICATION_BLOCKS_HERE}}": buildCertificationBlock(tailoredContent.certifications),
  };

  let output = rawTemplate;
  for (const [placeholder, value] of Object.entries(replacements)) {
    output = output.split(placeholder).join(value);
  }
  return output;
}

module.exports = { injectTemplate };