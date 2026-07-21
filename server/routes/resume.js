const JobApplication = require("../models/JobApplication");
const fs = require("fs-extra");
const path = require("path");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const auth = require("../middleware/auth");
const { injectTemplate, buildDefaultSections, mergeSections } = require("../utils/buildLatex");
const { compileLatex } = require("../utils/compileLatex");

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/parse", auth, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
    const fileBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype === "application/pdf" ? "application/pdf" : req.file.mimetype;
    const prompt = `Extract all details from this resume into this exact JSON format:
    {
      "personal": {"name": "", "email": "", "phone": "", "country": "", "linkedin": "", "github": ""},
      "skills": [],
      "education": [{"university": "", "degree": "", "major": "", "cgpa": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "graduated": false}],
      "experience": [{"company": "", "role": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "description": ""}],
      "projects": [{"title": "", "techStack": "", "description": "", "link": ""}],
      "certificates": [{"name": "", "issuer": "", "date": "YYYY-MM-DD"}]
    }
    Return ONLY valid JSON. Do not include any markdown formatting. If information is missing, use empty strings or empty arrays.`;
    const result = await model.generateContent([{ inlineData: { data: fileBase64, mimeType } }, prompt]);
    const text = result.response.text();
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json(JSON.parse(jsonString));
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    res.status(500).json({ message: "Failed to parse resume." });
  }
});

router.post("/tailor", auth, async (req, res) => {
  try {
    const { companyName, jobDescription, template, userProfile, omitFields, jobId } = req.body;
    const safeOmitFields = Array.isArray(omitFields) ? omitFields : [];

    if (!jobDescription || !userProfile || Object.keys(userProfile).length === 0) {
      return res.status(400).json({ message: "Missing Job Description or Profile data." });
    }

    const templatePath = path.join(__dirname, `../templates/${template}.tex`);
    if (!(await fs.pathExists(templatePath))) {
      return res.status(404).json({ message: `Template ${template}.tex not found.` });
    }
    const rawLatexTemplate = await fs.readFile(templatePath, "utf8");

    const [tailoredContent, gapAnalysis] = await Promise.all([
      generateTailoredContent(userProfile, jobDescription),
      generateGapAnalysis(userProfile, jobDescription),
    ]);

    const fullContent = {
      summary: tailoredContent.summary,
      skills: tailoredContent.skills,
      experience: tailoredContent.experience,
      education: (userProfile.education || []).map((edu) => ({
        institution: edu.university,
        degree: edu.major ? `${edu.degree} (${edu.major})` : edu.degree,
        location: userProfile.personal?.country || "",
        startDate: edu.startDate,
        endDate: edu.graduated ? edu.endDate : "Present",
        cgpa: edu.cgpa,
      })),
      projects: tailoredContent.projects || [],
      certifications: tailoredContent.certifications || [],
      languages: tailoredContent.languages || [],
    };

    // If regenerating an existing job, merge fresh content into the
    // sections the user has already customized (renamed titles, hidden
    // sections, custom sections added via chat) rather than clobbering them.
    let existingJob = null;
    if (jobId) {
      existingJob = await JobApplication.findOne({ _id: jobId, userId: req.userId });
    }
    const sections = existingJob
      ? mergeSections(existingJob.sections, fullContent)
      : buildDefaultSections(fullContent);

    const finalLatex = injectTemplate(rawLatexTemplate, userProfile.personal || {}, sections, safeOmitFields, template);    const { pdfFileName } = await compileLatex(finalLatex);
    const pdfUrl = `https://jword-resume-builder.onrender.com/pdfs/${pdfFileName}`;

    const jobData = {
      userId: req.userId,
      companyName: companyName || "",
      jobDescription,
      template,
      personal: userProfile.personal || {},
      sections,
      gapAnalysis,
      omitFields: safeOmitFields,
      pdfUrl,
    };

    let savedJob = existingJob
      ? await JobApplication.findOneAndUpdate({ _id: jobId, userId: req.userId }, jobData, { new: true })
      : await JobApplication.create(jobData);

    res.json({
      success: true,
      jobId: savedJob._id,
      data: {
        gapAnalysis,
        sections,
        personal: userProfile.personal || {},
        omitFields: safeOmitFields,
        pdfUrl,
      },
    });
  } catch (error) {
    console.error("AI Tailoring/Compile Error:", error);
    res.status(500).json({ message: error.message || "Failed to tailor resume and analyze gaps." });
  }
});

router.post("/chat-edit", auth, async (req, res) => {
  try {
    const { jobId, userMessage } = req.body;
    if (!jobId || !userMessage) return res.status(400).json({ message: "Missing required fields" });

    const job = await JobApplication.findOne({ _id: jobId, userId: req.userId });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const editResult = await processChatEdit(job.personal || {}, job.sections || [], userMessage);

    if (editResult.offTopic) {
      return res.json({ success: true, isOffTopic: true, message: editResult.message });
    }

    const updatedPersonal = editResult.updatedPersonal || job.personal || {};
    const updatedSections = editResult.updatedSections || job.sections;

    const templatePath = path.join(__dirname, `../templates/${job.template}.tex`);
    const rawLatexTemplate = await fs.readFile(templatePath, "utf8");
    const finalLatex = injectTemplate(rawLatexTemplate, updatedPersonal, updatedSections, job.omitFields || [], job.template);
    const { pdfFileName } = await compileLatex(finalLatex);
    const pdfUrl = `https://jword-resume-builder.onrender.com/pdfs/${pdfFileName}`;

    job.personal = updatedPersonal;
    job.sections = updatedSections;
    job.pdfUrl = pdfUrl;
    await job.save();

    res.json({
      success: true,
      isOffTopic: false,
      message: editResult.message,
      data: { ...job.toObject(), pdfUrl }
    });
  } catch (error) {
    console.error("Chat Edit Error:", error);
    res.status(500).json({ message: "Failed to process edit." });
  }
});

async function generateTailoredContent(userProfile, jobDescription) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
  You are an expert career strategist building the best possible resume for a specific job.
  Rules:
  1. Experience & Education: Keep the user's actual past companies, roles, and dates. Do NOT invent fake jobs. Rewrite bullet points to be impressive and relevant.
  2. Skills: Merge the user's existing skills with the exact skills required by the JD.
  3. Projects: Keep relevant existing projects and enhance them; invent 1-2 highly impressive recommended projects using the JD's exact tech stack if the user's projects are irrelevant or too basic for the role.
  4. Certifications: Suggest 1-2 real, prioritizing FREE certifications unless the JD explicitly requires a paid one.
  5. Languages: If the base profile mentions spoken languages, include them; otherwise return an empty array.

  Return ONLY plain text content as this exact JSON:
  {
    "summary": "2-3 sentence highly tailored professional summary",
    "skills": { "Languages": ["..."], "Frameworks": ["..."] },
    "experience": [{ "company": "", "role": "", "location": "", "startDate": "", "endDate": "", "bullets": ["..."] }],
    "projects": [{ "title": "", "techStack": "", "bullets": ["..."] }],
    "certifications": [{ "name": "", "issuer": "", "date": "" }],
    "languages": [{ "language": "", "proficiency": "" }]
  }

  Base Profile: ${JSON.stringify(userProfile)}
  Target Job Description: ${jobDescription}
  `;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function generateGapAnalysis(userProfile, jobDescription) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
  });
  const prompt = `
You are an expert technical recruiter. Compare the target job description's
requirements against the user's profile and identify skills/technologies
mentioned in the JD that are missing from the profile. Return ONLY this JSON:
{ "missingSkills": ["Skill 1", "Skill 2"] }

User Profile: ${JSON.stringify(userProfile)}
Target Job Description: ${jobDescription}
`;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function processChatEdit(currentPersonal, currentSections, userMessage) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
  You are an expert resume editor working on a resume made of a flexible list of SECTIONS.
  Each section is: { id, type, title, visible, order, content }.

  WHAT YOU CAN DO:
  - Edit the "content" of any existing section (rewrite text, add/remove bullets, add/remove skills, etc.) matching its type's shape.
  - Rename any section's "title" (e.g. "Professional Summary" -> "Overview") -- titles are fully editable data now.
  - Hide a section the user doesn't want by setting "visible": false (its data stays saved, just not rendered).
  - Re-show a previously hidden section by setting "visible": true.
  - Add an entirely NEW section: push a new object with a unique "id" (slug of the title), "type": "custom", the user's chosen "title", "visible": true, the next "order" number, and "content": { "bullets": ["..."] }.
  - Reorder sections by changing their "order" values.
  - Edit personal.linkedin, personal.github, personal.phone, personal.email, personal.country.
  - Edit personal.linkedinLabel and personal.githubLabel -- these control the CLICKABLE TEXT shown for the LinkedIn/GitHub hyperlinks (e.g. the user's name, "GitHub Profile", a custom phrase). Changing the label does NOT change the destination URL, and changing the URL does NOT change the label -- they are separate fields. If the user says "change the GitHub hyperlink name/text to X", update personal.githubLabel to X. If they say "change my GitHub link to X" (a URL), update personal.github instead. Ask yourself which one the request is actually referring to before editing.
  Section type -> content shape:
  - summary: { "text": "..." }
  - skills: { "categories": { "Category Name": ["skill1","skill2"] } }
  - experience: { "items": [{ "company","role","location","startDate","endDate","bullets":[] }] }
  - projects: { "items": [{ "title","techStack","bullets":[],"link" }] }
  - education: { "items": [{ "institution","degree","location","startDate","endDate","cgpa" }] } (cgpa: "" hides it)
  - certifications: { "items": [{ "name","issuer","date" }] }
  - languages: { "items": [{ "language","proficiency" }] }
  - custom: { "bullets": ["..."] }

  WHAT YOU CANNOT DO (this is a fixed LaTeX layout, not per-section styling):
  - Change fonts, colors, spacing, or the visual design of the page.
  - Change how a section TYPE is laid out internally (e.g. you cannot make experience render as a table instead of the fixed subheading format).

  If the request is something you cannot do, respond offTopic: true with an honest explanation. Never claim a change happened if it didn't.
  If the request is doable, apply it and return the COMPLETE updated personal object and COMPLETE updated sections array (every section, not just the changed one).

  User Request: "${userMessage}"
  Current Personal Info: ${JSON.stringify(currentPersonal)}
  Current Sections: ${JSON.stringify(currentSections)}

  Return EXACTLY this JSON format:
  {
    "offTopic": boolean,
    "message": "Confirmation or honest explanation, plus a relevant follow-up question if applicable.",
    "updatedPersonal": { ... },
    "updatedSections": [ ... ]
  }
  `;
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const cleanJsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanJsonString);
}

module.exports = router;