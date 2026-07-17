const JobApplication = require("../models/JobApplication");
const fs = require("fs-extra");
const path = require("path");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const auth = require("../middleware/auth");
const { injectTemplate } = require("../utils/buildLatex");
const { compileLatex } = require("../utils/compileLatex");

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. PARSE ROUTE (unchanged from before) ---
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

    const result = await model.generateContent([
      { inlineData: { data: fileBase64, mimeType } },
      prompt,
    ]);
    const text = result.response.text();
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json(JSON.parse(jsonString));
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    res.status(500).json({ message: "Failed to parse resume." });
  }
});

// --- 2. TAILOR & COMPILE ROUTE ---
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
    };

    const finalLatex = injectTemplate(rawLatexTemplate, userProfile.personal || {}, fullContent, safeOmitFields);
    const { pdfFileName } = await compileLatex(finalLatex);
    const pdfUrl = `http://localhost:5000/pdfs/${pdfFileName}`;

    const jobData = {
      userId: req.userId,
      companyName: companyName || "",
      jobDescription,
      template,
      personal: userProfile.personal || {},
      tailoredProfile: fullContent,
      gapAnalysis,
      omitFields: safeOmitFields,
      pdfUrl,
    };

    let savedJob = null;
    if (jobId) {
      savedJob = await JobApplication.findOneAndUpdate(
        { _id: jobId, userId: req.userId },
        jobData,
        { new: true }
      );
    }
    if (!savedJob) {
      savedJob = await JobApplication.create(jobData);
    }

    res.json({
      success: true,
      jobId: savedJob._id,
      data: {
        gapAnalysis,
        tailoredProfile: fullContent,
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

// --- 3. CHAT-DRIVEN REALTIME EDIT ROUTE ---
router.post("/chat-edit", auth, async (req, res) => {
  try {
    const { jobId, userMessage } = req.body;
    if (!jobId || !userMessage) return res.status(400).json({ message: "Missing required fields" });

    // Find the saved job to get the current tailored profile
    const job = await JobApplication.findOne({ _id: jobId, userId: req.userId });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Call Gemini as the JSON Editor
    const editResult = await processChatEdit(job.tailoredProfile, userMessage);

    // If Gemini says it's off-topic, return immediately without touching the PDF
    if (editResult.offTopic) {
      return res.json({ success: true, isOffTopic: true, message: editResult.message });
    }

    const updatedProfile = editResult.updatedProfile;

    // Recompile the LaTeX with the newly edited JSON
    const templatePath = path.join(__dirname, `../templates/${job.template}.tex`);
    const rawLatexTemplate = await fs.readFile(templatePath, "utf8");
    const finalLatex = injectTemplate(rawLatexTemplate, job.personal || {}, updatedProfile, job.omitFields || []);
    
    const { pdfFileName } = await compileLatex(finalLatex);
    const pdfUrl = `http://localhost:5000/pdfs/${pdfFileName}`;

    // Save the changes back to the database
    job.tailoredProfile = updatedProfile;
    job.pdfUrl = pdfUrl;
    await job.save();

    res.json({
      success: true,
      isOffTopic: false,
      message: editResult.message,
      data: {
        ...job.toObject(),
        pdfUrl
      }
    });

  } catch (error) {
    console.error("Chat Edit Error:", error);
    res.status(500).json({ message: "Failed to process edit." });
  }
});

// --- HELPER FUNCTIONS ---

async function generateTailoredContent(userProfile, jobDescription) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
  You are an expert career strategist building the best possible resume for a specific job.
  Your goal is to create the PERFECT resume for the provided Job Description, showing the user exactly what their profile SHOULD look like to get hired.

  Rules:
  1. Experience & Education: Keep the user's actual past companies, roles, and dates from their base profile. Do NOT invent fake jobs. However, rewrite their bullet points to sound as impressive and relevant to the JD as logically possible.
  2. Skills: Merge the user's existing skills with the exact skills required by the JD.
  3. Projects (Real vs. Recommended): Evaluate the user's existing projects against the JD. If an existing project uses the required tech stack and matches the seniority of the role, KEEP it and enhance the bullet points. HOWEVER, if the existing projects are completely irrelevant, OR if the user is applying for a mid/senior-level role but only has beginner-level projects (e.g., a basic To-Do app or Calculator), invent 1-2 highly impressive recommended projects to replace or supplement them. These must use the JD's exact tech stack to give the user a roadmap of what to build. Aim for 2-3 high-impact projects total. Each project needs bullets that describe both WHAT to build and WHICH technologies to use, so a reader unfamiliar with the project understands the scope.
  4. Recommended Certifications: Suggest 1-2 real-world certifications that perfectly align with the JD requirements. CRITICAL: You must prioritize FREE certifications (e.g., freeCodeCamp, Microsoft Learn, free tiers of Meta/Google certs). The ONLY exception is if the JD explicitly names a required certificate, or the field mandates a paid industry-standard credential (e.g., CompTIA Security+ or CISSP for Cybersecurity).

  Return ONLY plain text content as this exact JSON:
  {
    "summary": "2-3 sentence highly tailored professional summary",
    "skills": { "Languages": ["..."], "Frameworks": ["..."] },
    "experience": [
      { "company": "", "role": "", "location": "", "startDate": "", "endDate": "", "bullets": ["..."] }
    ],
    "projects": [
      { "title": "Project Name", "techStack": "React, Node, etc", "bullets": ["What to build and which tech to use, point 1", "point 2"] }
    ],
    "certifications": [
      { "name": "Certificate Name", "issuer": "Issuing Organization", "date": "In Progress" }
    ]
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

async function processChatEdit(currentProfile, userMessage) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
  You are an expert resume editor. The user will ask you to change their resume.
  If the user's request is NOT related to modifying the resume (e.g., asking general questions, coding help, off-topic chat), you must reject it.

  User Request: "${userMessage}"

  Current Resume JSON:
  ${JSON.stringify(currentProfile)}

  Return EXACTLY this JSON format:
  {
    "offTopic": boolean (true if request is completely unrelated to editing the resume, false otherwise),
    "message": "A short response to the user. If offTopic is true, say 'I will only apply changes to the resume.' If false, briefly say what you changed (e.g., 'Summary updated!').",
    "updatedProfile": { ... the entire updated resume JSON matching the Current Resume JSON structure, with the changes applied. If offTopic is true, leave this null. }
  }
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Clean the string before parsing to prevent crashes
  const cleanJsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleanJsonString);
}

module.exports = router;