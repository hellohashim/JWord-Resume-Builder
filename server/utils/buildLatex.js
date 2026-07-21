const { escapeLatex } = require("./latexEscape");

function formatDateRange(start, end) {
  const s = escapeLatex(start || "");
  const e = escapeLatex(end || "Present");
  if (!s && !e) return "";
  return `${s} -- ${e}`;
}

// ---------------------------------------------------------------------
// Contact line variant 1: single centered pipe-separated line.
// Used by: classic, minimalist
// ---------------------------------------------------------------------
function buildContactLine(personalInfo = {}, omitFields = []) {
  const isOmitted = (path) => omitFields.includes(path);
  const segments = [];

  if (personalInfo.phone) {
    segments.push(`\\faPhone* \\texttt{${escapeLatex(personalInfo.phone)}}`);
  }
  if (personalInfo.email) {
    segments.push(`\\href{mailto:${personalInfo.email}}{\\faEnvelope \\hspace{2pt} \\texttt{${escapeLatex(personalInfo.email)}}}`);
  }
  if (!isOmitted("personal.linkedin") && personalInfo.linkedin && personalInfo.linkedin.trim() !== "N/A" && personalInfo.linkedin.trim() !== "") {
    const linkedInLabel = personalInfo.linkedinLabel || personalInfo.name || "LinkedIn";
    segments.push(`\\faLinkedin \\hspace{2pt} \\href{${personalInfo.linkedin}}{${escapeLatex(linkedInLabel)}}`);
  }
  if (!isOmitted("personal.github") && personalInfo.github && personalInfo.github.trim() !== "N/A" && personalInfo.github.trim() !== "") {
    const githubLabel = personalInfo.githubLabel || "GitHub Profile";
    segments.push(`\\faGithub \\hspace{2pt} \\href{${personalInfo.github}}{${escapeLatex(githubLabel)}}`);
  }
  const location = personalInfo.country || personalInfo.location;
  if (location) {
    segments.push(`\\faMapMarker* \\hspace{2pt}\\texttt{${escapeLatex(location)}}`);
  }

  return segments.join(" \\hspace{1pt} $|$\n    \\hspace{1pt} ");
}

// ---------------------------------------------------------------------
// Contact line variant 2: two-column header table -- name + email +
// location on the left, phone + LinkedIn + GitHub on the right, one
// pair per row via "&". This is the ONLY version now -- the earlier
// single-column duplicate has been removed, since keeping two functions
// with the same name is exactly what caused the mismatched output.
// Used by: nit_srinagar
// ---------------------------------------------------------------------
function buildContactLineStacked(personalInfo = {}, omitFields = []) {
  const isOmitted = (path) => omitFields.includes(path);
  const left = [];
  const right = [];

  left.push(`\\textbf{\\Large ${escapeLatex(personalInfo.name || "N/A")}}`);
  if (personalInfo.email) {
    left.push(`\\href{mailto:${personalInfo.email}}{\\raisebox{0.0\\height}{\\footnotesize \\faEnvelope}\\ ${escapeLatex(personalInfo.email)}}`);
  }
  const location = personalInfo.country || personalInfo.location;
  if (location) {
    left.push(escapeLatex(location));
  }

  if (personalInfo.phone) {
    right.push(`{\\raisebox{0.0\\height}{\\footnotesize \\faPhone}\\ ${escapeLatex(personalInfo.phone)}}`);
  }
  if (!isOmitted("personal.linkedin") && personalInfo.linkedin && personalInfo.linkedin.trim() !== "N/A" && personalInfo.linkedin.trim() !== "") {
    const label = personalInfo.linkedinLabel || personalInfo.name || "LinkedIn Profile";
    right.push(`\\href{${personalInfo.linkedin}}{\\raisebox{0.0\\height}{\\footnotesize \\faLinkedin}\\ ${escapeLatex(label)}}`);
  }
  if (!isOmitted("personal.github") && personalInfo.github && personalInfo.github.trim() !== "N/A" && personalInfo.github.trim() !== "") {
    const label = personalInfo.githubLabel || "GitHub Profile";
    right.push(`\\href{${personalInfo.github}}{\\raisebox{0.0\\height}{\\footnotesize \\faGithub}\\ ${escapeLatex(label)}}`);
  }

  const maxRows = Math.max(left.length, right.length);
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    rows.push(`  ${left[i] || ""} & ${right[i] || ""}`);
  }

  return rows.join(" \\\\\n");
}

// ---------------------------------------------------------------------
// Contact line variant 3: centered address-block style, one line per
// item, no icons (matches serif/academic templates).
// Used by: elegant
// ---------------------------------------------------------------------
function buildContactLineAddressBlock(personalInfo = {}, omitFields = []) {
  const isOmitted = (path) => omitFields.includes(path);
  const lines = [];

  const contactBits = [];
  if (personalInfo.phone) contactBits.push(escapeLatex(personalInfo.phone));
  if (personalInfo.email) contactBits.push(`\\href{mailto:${personalInfo.email}}{${escapeLatex(personalInfo.email)}}`);
  const location = personalInfo.country || personalInfo.location;
  if (location) contactBits.push(escapeLatex(location));
  if (contactBits.length) lines.push(contactBits.join(" $\\diamond$ "));

  const linkBits = [];
  if (!isOmitted("personal.linkedin") && personalInfo.linkedin && personalInfo.linkedin.trim() !== "N/A" && personalInfo.linkedin.trim() !== "") {
    const label = personalInfo.linkedinLabel || "LinkedIn";
    linkBits.push(`\\href{${personalInfo.linkedin}}{${escapeLatex(label)}}`);
  }
  if (!isOmitted("personal.github") && personalInfo.github && personalInfo.github.trim() !== "N/A" && personalInfo.github.trim() !== "") {
    const label = personalInfo.githubLabel || "GitHub";
    linkBits.push(`\\href{${personalInfo.github}}{${escapeLatex(label)}}`);
  }
  if (linkBits.length) lines.push(linkBits.join(" $\\diamond$ "));

  return lines.join("\\\\\n");
}

// ---------------------------------------------------------------------
// Body builders -- each takes raw content and returns the LaTeX body
// for that section type. No \section{} header here; the dispatcher adds
// that using the section's own (user-editable) title.
// ---------------------------------------------------------------------

function buildSummaryBody(content = {}) {
  return `\\vspace{2pt}\n\\small{\n${escapeLatex(content.text || "")}\n}\n\\vspace{5pt}`;
}

function buildSkillsBody(content = {}) {
  const categories = content.categories || {};
  const lines = Object.entries(categories).map(([category, items]) => {
    const catEsc = escapeLatex(category);
    const itemsEsc = (items || []).map(escapeLatex).join(", ");
    return `    \\textbf{${catEsc}} {: ${itemsEsc}} \\vspace{2pt} \\\\`;
  });
  const inner = lines.length ? lines.join("\n") : "~ % empty";
  return `\\begin{itemize}[leftmargin=0in, label={}]\n \\small{\\item{\n${inner}\n}}\n\\end{itemize}`;
}

function buildBulletList(bullets = []) {
  if (!bullets || !bullets.length) return "";
  const items = bullets.map((b) => `        \\resumeItem{${escapeLatex(b)}}`).join("\n");
  return `    \\resumeItemListStart\n${items}\n    \\resumeItemListEnd`;
}

function buildExperienceBody(content = {}) {
  const items = content.items || [];
  if (!items.length) return "\\resumeSubHeadingListStart\n    \\item ~ % empty\n\\resumeSubHeadingListEnd";
  const inner = items.map((exp) => {
    const heading = `    \\resumeSubheading{${escapeLatex(exp.company)}}{${formatDateRange(exp.startDate, exp.endDate)}}{${escapeLatex(exp.role)}}{${escapeLatex(exp.location || "")}}`;
    return `${heading}\n${buildBulletList(exp.bullets)}`;
  }).join("\n\n");
  return `\\resumeSubHeadingListStart\n${inner}\n\\resumeSubHeadingListEnd`;
}

function buildProjectsBody(content = {}) {
  const items = content.items || [];
  if (!items.length) return "\\resumeSubHeadingListStart\n    \\item ~ % empty\n\\resumeSubHeadingListEnd";
  const inner = items.map((proj) => {
    const titleText = escapeLatex(proj.title);
    const linkedTitle = proj.link ? `\\href{${proj.link}}{${titleText}}` : `\\textbf{${titleText}}`;
    const title = `${linkedTitle} $|$ \\emph{${escapeLatex(proj.techStack || "")}}`;
    const heading = `      \\resumeProjectHeading{${title}}{}`;
    return `${heading}\n${buildBulletList(proj.bullets)}`;
  }).join("\n\n");
  return `\\resumeSubHeadingListStart\n${inner}\n\\resumeSubHeadingListEnd`;
}

function buildEducationBody(content = {}) {
  const items = content.items || [];
  if (!items.length) return "\\resumeSubHeadingListStart\n    \\item ~ % empty\n\\resumeSubHeadingListEnd";
  const inner = items.map((edu) => {
    if (edu.cgpa) {
      const cgpaText = `CGPA: ${escapeLatex(edu.cgpa)}`;
      return `    \\resumeSubheadingWithCGPA{${escapeLatex(edu.institution)}}{${formatDateRange(edu.startDate, edu.endDate)}}{${escapeLatex(edu.degree)}}{${escapeLatex(edu.location || "")}}{${cgpaText}}`;
    }
    return `    \\resumeSubheading{${escapeLatex(edu.institution)}}{${formatDateRange(edu.startDate, edu.endDate)}}{${escapeLatex(edu.degree)}}{${escapeLatex(edu.location || "")}}`;
  }).join("\n\n");
  return `\\resumeSubHeadingListStart\n${inner}\n\\resumeSubHeadingListEnd`;
}

function buildCertificationsBody(content = {}) {
  const items = content.items || [];
  const inner = items.length
    ? items.map((cert) => {
        const name = escapeLatex(cert.name);
        const issuer = cert.issuer ? ` {- ${escapeLatex(cert.issuer)}}` : "";
        const date = cert.date ? ` \\hfill ${escapeLatex(cert.date)}` : "";
        const searchQuery = encodeURIComponent(`${cert.name} ${cert.issuer || ""} enroll`.trim());
        const url = `https://www.google.com/search?q=${searchQuery}`;
        return `     \\href{${url}}{\\textbf{${name}}}${issuer}${date} \\\\[3pt]`;
      }).join("\n")
    : "~ % empty";
  return `\\begin{itemize}[leftmargin=0in, label={}]\n \\small{\\item{\n${inner}\n}}\n\\end{itemize}`;
}

function buildLanguagesBody(content = {}) {
  const items = content.items || [];
  const inner = items.length
    ? `    \\textbf{Languages} {: ${items.map((l) => escapeLatex(l.language || "") + (l.proficiency ? ` (${escapeLatex(l.proficiency)})` : "")).join(", ")}} \\vspace{2pt} \\\\`
    : "~ % empty";
  return `\\begin{itemize}[leftmargin=0in, label={}]\n \\small{\\item{\n${inner}\n}}\n\\end{itemize}`;
}

function buildCustomBody(content = {}) {
  const bullets = content.bullets || [];
  if (!bullets.length) return "\\begin{itemize}[leftmargin=0in, label={}]\n    \\item ~ % empty\n\\end{itemize}";
  const inner = bullets.map((b) => `    \\resumeItem{${escapeLatex(b)}}`).join("\n");
  return `\\begin{itemize}[leftmargin=0in, label={}]\n${inner}\n\\end{itemize}`;
}

const BODY_BUILDERS = {
  summary: buildSummaryBody,
  skills: buildSkillsBody,
  experience: buildExperienceBody,
  projects: buildProjectsBody,
  education: buildEducationBody,
  certifications: buildCertificationsBody,
  languages: buildLanguagesBody,
  custom: buildCustomBody,
};

function buildSectionLatex(section) {
  if (!section || section.visible === false) return "";
  const builder = BODY_BUILDERS[section.type];
  if (!builder) return "";
  const title = escapeLatex((section.title || "").toUpperCase());
  const body = builder(section.content || {});
  return `%-----------${title}-----------\n\\section{${title}}\n${body}`;
}

const CONTACT_LINE_STYLES = {
  classic: buildContactLine,
  minimalist: buildContactLine,
  nit_srinagar: buildContactLineStacked,
  elegant: buildContactLineAddressBlock,
  modern_sidebar: buildContactLine,
  compact_ats: buildContactLinePlain,
  harvard: buildContactLineAddressBlock,
  deedy_lite: buildContactLine,
  awesome_cv_lite: buildContactLineStacked,
};

function injectTemplate(rawTemplate, personalInfo, sections = [], omitFields = [], templateName = "classic") {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const sectionsLatex = sorted.map(buildSectionLatex).filter(Boolean).join("\n\n");

  const contactBuilder = CONTACT_LINE_STYLES[templateName] || buildContactLine;
  const contactLine = contactBuilder(personalInfo, omitFields);

  const replacements = {
    "{{PERSONAL_NAME}}": escapeLatex(personalInfo.name),
    "{{CONTACT_LINE}}": contactLine,
    "{{INSERT_SECTIONS_HERE}}": sectionsLatex,
  };

  let output = rawTemplate;
  for (const [placeholder, value] of Object.entries(replacements)) {
    output = output.split(placeholder).join(value);
  }
  return output;
}
// ---------------------------------------------------------------------
// Contact line variant 4: plain, icon-free, comma-separated. Deliberately
// avoids FontAwesome glyphs -- some ATS parsers mis-read icon characters
// as garbage text, so this is the safest option for a true "ATS-first" template.
// Used by: compact_ats
// ---------------------------------------------------------------------
function buildContactLinePlain(personalInfo = {}, omitFields = []) {
  const isOmitted = (path) => omitFields.includes(path);
  const bits = [];

  if (personalInfo.phone) bits.push(escapeLatex(personalInfo.phone));
  if (personalInfo.email) bits.push(`\\href{mailto:${personalInfo.email}}{${escapeLatex(personalInfo.email)}}`);
  const location = personalInfo.country || personalInfo.location;
  if (location) bits.push(escapeLatex(location));
  if (!isOmitted("personal.linkedin") && personalInfo.linkedin && personalInfo.linkedin.trim() !== "N/A" && personalInfo.linkedin.trim() !== "") {
    const label = personalInfo.linkedinLabel || "LinkedIn";
    bits.push(`\\href{${personalInfo.linkedin}}{${escapeLatex(label)}}`);
  }
  if (!isOmitted("personal.github") && personalInfo.github && personalInfo.github.trim() !== "N/A" && personalInfo.github.trim() !== "") {
    const label = personalInfo.githubLabel || "GitHub";
    bits.push(`\\href{${personalInfo.github}}{${escapeLatex(label)}}`);
  }

  return bits.join(" | ");
}

function buildDefaultSections(fullContent) {
  let order = 0;
  const sections = [
    { id: "summary", type: "summary", title: "Professional Summary", visible: true, order: order++, content: { text: fullContent.summary } },
    { id: "skills", type: "skills", title: "Skills", visible: true, order: order++, content: { categories: fullContent.skills } },
    { id: "experience", type: "experience", title: "Experience", visible: true, order: order++, content: { items: fullContent.experience } },
    { id: "projects", type: "projects", title: "Projects", visible: true, order: order++, content: { items: fullContent.projects } },
    { id: "education", type: "education", title: "Education", visible: true, order: order++, content: { items: fullContent.education } },
    { id: "certifications", type: "certifications", title: "Certifications", visible: true, order: order++, content: { items: fullContent.certifications } },
  ];
  if (fullContent.languages && fullContent.languages.length) {
    sections.push({ id: "languages", type: "languages", title: "Languages", visible: true, order: order++, content: { items: fullContent.languages } });
  }
  return sections;
}

function mergeSections(existingSections = [], freshFullContent) {
  const freshDefaults = buildDefaultSections(freshFullContent);
  const existingById = new Map(existingSections.map((s) => [s.id, s]));

  const merged = freshDefaults.map((fresh) => {
    const existing = existingById.get(fresh.id);
    if (!existing) return fresh;
    return { ...fresh, title: existing.title, visible: existing.visible, order: existing.order };
  });

  const customSections = existingSections.filter((s) => s.type === "custom");
  return [...merged, ...customSections].sort((a, b) => a.order - b.order);
}

module.exports = { injectTemplate, buildDefaultSections, mergeSections };