import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./ResultDashboard.module.css";

const API_BASE = "https://jword-resume-builder.onrender.com";

function getSection(sections, type) {
  return (sections || []).find((s) => s.type === type);
}

const ResultDashboard = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [aiData, setAiData] = useState(null);
  const [jobMeta, setJobMeta] = useState(null);
  const [learnTab, setLearnTab] = useState("skills");
  const [missingFields, setMissingFields] = useState([]);
  const [missingValues, setMissingValues] = useState({});
  const [ignoredFieldIds, setIgnoredFieldIds] = useState([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingSectionId, setTogglingSectionId] = useState(null);
  const [savingSectionId, setSavingSectionId] = useState(null);
  const [activeTab, setActiveTab] = useState("edit");
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: "ai", content: "How can I tweak this resume for you?" },
  ]);
  const [sectionDrafts, setSectionDrafts] = useState({}); // { [sectionId]: content }
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    const loadJob = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Job not found");
        const job = await res.json();

        setJobMeta({
          companyName: job.companyName,
          jobDescription: job.jobDescription,
          template: job.template,
        });
        setAiData({
          gapAnalysis: job.gapAnalysis,
          sections: job.sections,
          personal: job.personal,
          omitFields: job.omitFields,
          pdfUrl: job.pdfUrl,
        });
        setIgnoredFieldIds(job.omitFields || []);
      } catch (err) {
        console.error("Failed to load job:", err);
        setAiData(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) loadJob();
  }, [jobId]);

  useEffect(() => {
    if (aiData) setMissingFields(computeMissingFields(aiData, ignoredFieldIds));
  }, [aiData, ignoredFieldIds]);

  function computeMissingFields(data, ignoredIds) {
    const items = [];
    const personal = data.personal || {};
    if (!ignoredIds.includes("personal.linkedin") && !personal.linkedin) {
      items.push({ id: "personal.linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/yourname" });
    }
    if (!ignoredIds.includes("personal.github") && !personal.github) {
      items.push({ id: "personal.github", label: "GitHub URL", placeholder: "https://github.com/yourname" });
    }
    const eduSection = getSection(data.sections, "education");
    (eduSection?.content?.items || []).forEach((edu, idx) => {
      const id = `education.${idx}.cgpa`;
      if (!ignoredIds.includes(id) && !edu.cgpa) {
        items.push({ id, label: `CGPA (${edu.institution || "Education #" + (idx + 1)})`, placeholder: "e.g., 3.8" });
      }
    });
    return items;
  }

  const regenerate = useCallback(async (omitFieldsOverride) => {
    if (!jobMeta) {
      alert("Couldn't load the original job details. Try refreshing the page.");
      return;
    }
    const token = localStorage.getItem("token");
    setIsRegenerating(true);
    try {
      const profileRes = await fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (!profileRes.ok) throw new Error("Could not fetch your saved profile from the database.");
      const freshProfile = await profileRes.json();

      const res = await fetch(`${API_BASE}/api/resume/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jobId,
          companyName: jobMeta.companyName,
          jobDescription: jobMeta.jobDescription,
          template: jobMeta.template,
          userProfile: freshProfile,
          omitFields: omitFieldsOverride,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to regenerate resume");
      }
      const result = await res.json();
      setAiData(result.data);
      setSectionDrafts({});
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  }, [jobId, jobMeta]);

  const handleIgnore = async (fieldId) => {
    const updatedIgnored = [...ignoredFieldIds, fieldId];
    setIgnoredFieldIds(updatedIgnored);
    await regenerate(updatedIgnored);
  };

  const handleSaveAndRegenerate = async () => {
    const patch = {};
    Object.entries(missingValues).forEach(([fieldId, value]) => {
      if (value && value.trim()) patch[fieldId] = value.trim();
    });
    if (Object.keys(patch).length === 0) {
      alert("Fill in at least one field before saving, or use Ignore instead.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to save profile details.");
      setMissingValues({});
      await regenerate(ignoredFieldIds);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleSection = async (sectionId) => {
    const token = localStorage.getItem("token");
    setTogglingSectionId(sectionId);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/sections/${sectionId}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to toggle section");
      }
      const result = await res.json();
      setAiData({
        gapAnalysis: result.data.gapAnalysis,
        sections: result.data.sections,
        personal: result.data.personal,
        omitFields: result.data.omitFields,
        pdfUrl: result.data.pdfUrl,
      });
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setTogglingSectionId(null);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userText = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", content: userText }]);
    setIsChatting(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/resume/chat-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId, userMessage: userText }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Backend error: Could not process chat.");

      setChatHistory((prev) => [...prev, { role: "ai", content: result.message }]);

      if (!result.isOffTopic && result.data) {
        setAiData({
          gapAnalysis: result.data.gapAnalysis,
          sections: result.data.sections,
          personal: result.data.personal,
          omitFields: result.data.omitFields,
          pdfUrl: result.data.pdfUrl,
        });
        setSectionDrafts({});
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: "ai", content: `Error: ${err.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

  // --- MANUAL EDITING HELPERS -------------------------------------------

  const getDraft = (section) => sectionDrafts[section.id] ?? section.content ?? {};

  const setDraft = (sectionId, updater) => {
    setSectionDrafts((prev) => {
      const base = prev[sectionId] ?? aiData.sections.find((s) => s.id === sectionId)?.content ?? {};
      const next = typeof updater === "function" ? updater(base) : updater;
      return { ...prev, [sectionId]: next };
    });
  };

  const isDirty = (section) => {
    const draft = sectionDrafts[section.id];
    if (draft === undefined) return false;
    return JSON.stringify(draft) !== JSON.stringify(section.content || {});
  };

  const saveSectionContent = async (section) => {
    const draft = sectionDrafts[section.id];
    if (draft === undefined) return;
    const token = localStorage.getItem("token");
    setSavingSectionId(section.id);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/sections/${section.id}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save section.");
      }
      const result = await res.json();
      setAiData({
        gapAnalysis: result.data.gapAnalysis,
        sections: result.data.sections,
        personal: result.data.personal,
        omitFields: result.data.omitFields,
        pdfUrl: result.data.pdfUrl,
      });
      setSectionDrafts((prev) => {
        const next = { ...prev };
        delete next[section.id];
        return next;
      });
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSavingSectionId(null);
    }
  };

  // --- MANUAL EDITORS PER SECTION TYPE ------------------------------------

  const renderEditor = (section) => {
    const draft = getDraft(section);

    switch (section.type) {
      case "summary":
        return (
          <textarea
            className={styles.editTextarea}
            rows={4}
            value={draft.text || ""}
            onChange={(e) => setDraft(section.id, { ...draft, text: e.target.value })}
          />
        );

      case "skills": {
        const categories = draft.categories || {};
        return (
          <div className={styles.editStack}>
            {Object.entries(categories).map(([cat, items]) => (
              <div key={cat} className={styles.editRow}>
                <label className={styles.editRowLabel}>{cat}</label>
                <input
                  className={styles.editInput}
                  value={(items || []).join(", ")}
                  onChange={(e) => {
                    const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                    setDraft(section.id, { ...draft, categories: { ...categories, [cat]: list } });
                  }}
                />
              </div>
            ))}
          </div>
        );
      }

      case "languages": {
        const items = draft.items || [];
        const asText = items.map((l) => `${l.language || ""} - ${l.proficiency || ""}`).join("\n");
        return (
          <textarea
            className={styles.editTextarea}
            rows={3}
            placeholder="English - Native&#10;Urdu - Fluent"
            defaultValue={asText}
            onChange={(e) => {
              const parsed = e.target.value.split("\n").filter(Boolean).map((line) => {
                const [language, proficiency] = line.split(" - ");
                return { language: (language || "").trim(), proficiency: (proficiency || "").trim() };
              });
              setDraft(section.id, { ...draft, items: parsed });
            }}
          />
        );
      }

      case "certifications": {
        const items = draft.items || [];
        return (
          <div className={styles.editStack}>
            {items.map((cert, idx) => (
              <div key={idx} className={styles.editCard}>
                <input
                  className={styles.editInput}
                  placeholder="Certificate name"
                  value={cert.name || ""}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    setDraft(section.id, { ...draft, items: updated });
                  }}
                />
                <div className={styles.editInlineRow}>
                  <input
                    className={styles.editInput}
                    placeholder="Issuer"
                    value={cert.issuer || ""}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx] = { ...updated[idx], issuer: e.target.value };
                      setDraft(section.id, { ...draft, items: updated });
                    }}
                  />
                  <input
                    className={styles.editInput}
                    placeholder="Date"
                    value={cert.date || ""}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx] = { ...updated[idx], date: e.target.value };
                      setDraft(section.id, { ...draft, items: updated });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "experience":
      case "projects": {
        const items = draft.items || [];
        return (
          <div className={styles.editStack}>
            {items.map((item, idx) => (
              <div key={idx} className={styles.editCard}>
                <div className={styles.editInlineRow}>
                  <input
                    className={styles.editInput}
                    placeholder={section.type === "experience" ? "Company" : "Project title"}
                    value={(section.type === "experience" ? item.company : item.title) || ""}
                    onChange={(e) => {
                      const updated = [...items];
                      const key = section.type === "experience" ? "company" : "title";
                      updated[idx] = { ...updated[idx], [key]: e.target.value };
                      setDraft(section.id, { ...draft, items: updated });
                    }}
                  />
                  <input
                    className={styles.editInput}
                    placeholder={section.type === "experience" ? "Role" : "Tech Stack"}
                    value={(section.type === "experience" ? item.role : item.techStack) || ""}
                    onChange={(e) => {
                      const updated = [...items];
                      const key = section.type === "experience" ? "role" : "techStack";
                      updated[idx] = { ...updated[idx], [key]: e.target.value };
                      setDraft(section.id, { ...draft, items: updated });
                    }}
                  />
                </div>
                <label className={styles.editRowLabel}>Bullet points (one per line)</label>
                <textarea
                  className={styles.editTextarea}
                  rows={3}
                  value={(item.bullets || []).join("\n")}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx] = { ...updated[idx], bullets: e.target.value.split("\n") };
                    setDraft(section.id, { ...draft, items: updated });
                  }}
                />
              </div>
            ))}
          </div>
        );
      }

      case "education": {
        const items = draft.items || [];
        return (
          <div className={styles.editStack}>
            {items.map((edu, idx) => (
              <div key={idx} className={styles.editCard}>
                <div className={styles.editInlineRow}>
                  <input
                    className={styles.editInput}
                    placeholder="Institution"
                    value={edu.institution || ""}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx] = { ...updated[idx], institution: e.target.value };
                      setDraft(section.id, { ...draft, items: updated });
                    }}
                  />
                  <input
                    className={styles.editInput}
                    placeholder="CGPA"
                    value={edu.cgpa || ""}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx] = { ...updated[idx], cgpa: e.target.value };
                      setDraft(section.id, { ...draft, items: updated });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "custom": {
        const bullets = draft.bullets || [];
        return (
          <textarea
            className={styles.editTextarea}
            rows={4}
            placeholder="One bullet per line"
            value={bullets.join("\n")}
            onChange={(e) => setDraft(section.id, { ...draft, bullets: e.target.value.split("\n") })}
          />
        );
      }

      default:
        return <p className={styles.emptyText}>This section type can't be manually edited yet.</p>;
    }
  };

  if (isLoading) {
    return <div className={styles.emptyState}><p>Loading your resume…</p></div>;
  }

  if (!aiData) {
    return (
      <div className={styles.emptyState}>
        <p>No resume found for this job. Please go to <strong>Build CV</strong> to generate one first!</p>
      </div>
    );
  }

  const cleanPdfUrl = aiData.pdfUrl ? `${aiData.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0` : "";
  const projectsSection = getSection(aiData.sections, "projects");
  const certsSection = getSection(aiData.sections, "certifications");
  const projects = projectsSection?.content?.items || [];
  const certifications = certsSection?.content?.items || [];
  const anyBusy = isRegenerating || isChatting || togglingSectionId || savingSectionId;

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.pageHeader}>
        <h2>Your Tailored Resume</h2>
        <p>Review, edit with AI, and bridge your skill gaps.</p>
      </div>

      <div className={styles.topSection}>
        <div className={styles.pdfWrapper}>
          <div className={styles.panelHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Document Preview</h3>
            {aiData.pdfUrl && (
              <a href={aiData.pdfUrl} download="Tailored_Resume.pdf" className={styles.downloadLink}>
                <button className={styles.downloadHeaderBtn}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={styles.downloadIcon}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download
                </button>
              </a>
            )}
          </div>

          <div className={styles.pdfViewer}>
            {anyBusy && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, color: "#388087", fontWeight: "bold" }}>
                Updating PDF...
              </div>
            )}
            {cleanPdfUrl ? (
              <iframe src={cleanPdfUrl} width="100%" height="100%" title="Resume PDF" style={{ border: "none" }} />
            ) : (
              <p className={styles.missingPdf}>PDF missing.</p>
            )}
          </div>
        </div>

        <div className={styles.chatWrapper}>
          <div className={styles.panelHeader}>
            <div className={styles.modeSwitcher}>
              <button
                type="button"
                className={`${styles.modeTab} ${activeTab === "edit" ? styles.modeTabActive : ""}`}
                onClick={() => setActiveTab("edit")}
              >
                Gemini
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${activeTab === "manual" ? styles.modeTabActive : ""}`}
                onClick={() => setActiveTab("manual")}
              >
                Manual
              </button>
              <span className={`${styles.modeIndicator} ${activeTab === "manual" ? styles.modeIndicatorRight : ""}`} />
            </div>
          </div>

          <div className={styles.slideViewport}>
            <div
              className={styles.slideTrack}
              style={{ transform: activeTab === "manual" ? "translateX(-50%)" : "translateX(0%)" }}
            >
              {/* --- PANE 1: GEMINI CHAT --- */}
              <div className={styles.slidePane}>
                <div className={styles.chatWindow}>
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={styles.chatMessage}
                      style={{ background: "transparent", boxShadow: "none", padding: 0, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
                    >
                      <div className={styles.avatar} style={{ background: msg.role === "user" ? "#111827" : "var(--primary-teal)" }}>
                        {msg.role === "user" ? "U" : "G"}
                      </div>
                      <div className={styles.bubble} style={{ background: msg.role === "user" ? "var(--primary-teal)" : "#f3f4f6", color: msg.role === "user" ? "white" : "#1f2937" }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className={styles.chatMessage} style={{ background: "transparent", boxShadow: "none", padding: 0 }}>
                      <div className={styles.avatar}>G</div>
                      <div className={styles.bubble}><em>Applying changes...</em></div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form className={styles.chatInputArea} onSubmit={handleChatSubmit}>
                  <input
                    type="text"
                    placeholder="e.g., Rename the summary section to 'Overview'..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatting}
                  />
                  <button type="submit" disabled={isChatting}>Send</button>
                </form>
              </div>

              {/* --- PANE 2: MANUAL EDITING --- */}
              <div className={styles.slidePane}>
                <div className={styles.manualPane}>
                  <p className={styles.manualHint}>
                    Toggle a section off to hide it, or edit its content directly below and save.
                  </p>

                  {[...(aiData.sections || [])].sort((a, b) => a.order - b.order).map((section) => {
                    const isOn = section.visible !== false;
                    const isBusyToggle = togglingSectionId === section.id;
                    const isBusySave = savingSectionId === section.id;
                    const dirty = isDirty(section);

                    return (
                      <div key={section.id} className={styles.manualSectionBlock}>
                        <div className={styles.sectionRow}>
                          <div className={styles.sectionRowLeft}>
                            <span className={`${styles.sectionDot} ${isOn ? styles.sectionDotOn : styles.sectionDotOff}`} />
                            <span className={styles.sectionRowTitle}>{section.title}</span>
                          </div>
                          <label className={styles.toggleSwitch}>
                            <input
                              type="checkbox"
                              checked={isOn}
                              disabled={isBusyToggle}
                              onChange={() => handleToggleSection(section.id)}
                            />
                            <span className={styles.toggleSlider}></span>
                          </label>
                        </div>

                        {isOn && (
                          <div className={styles.manualEditorWrap}>
                            {renderEditor(section)}
                            <button
                              type="button"
                              className={`${styles.saveChangesBtn} ${dirty ? styles.saveChangesBtnActive : ""}`}
                              disabled={!dirty || isBusySave}
                              onClick={() => saveSectionContent(section)}
                            >
                              {isBusySave ? "Saving..." : dirty ? "Save Changes" : "Saved"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.learningSection}>
        <div className={styles.learningHeader}>
          <div>
            <h3>Your Learning Path</h3>
            <p>Master these missing requirements to land this job.</p>
          </div>
        </div>

        <div className={styles.learningTabs}>
          <button className={learnTab === "skills" ? styles.activeTab : ""} onClick={() => setLearnTab("skills")}>Skills to Learn</button>
          <button className={learnTab === "projects" ? styles.activeTab : ""} onClick={() => setLearnTab("projects")}>Recommended Projects</button>
          <button className={learnTab === "certificates" ? styles.activeTab : ""} onClick={() => setLearnTab("certificates")}>Recommended Certifications</button>
        </div>

        <div className={styles.learningContent}>
          {learnTab === "skills" && (
            <div className={styles.cardGrid}>
              {aiData.gapAnalysis?.missingSkills?.length > 0 ? (
                aiData.gapAnalysis.missingSkills.map((skill, index) => (
                  <div key={index} className={styles.learningCard}>
                    <span className={styles.skillName}>{skill}</span>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " full course tutorial")}`}
                      target="_blank" rel="noreferrer" className={styles.courseBtn}
                    >
                      Watch Course
                    </a>
                  </div>
                ))
              ) : (
                <p className={styles.successText}>✨ Great news! You have all the required skills for this job.</p>
              )}
            </div>
          )}

          {learnTab === "projects" && (
            <div className={styles.projectList}>
              {projects.length > 0 ? (
                projects.map((proj, i) => (
                  <div key={i} className={styles.projectRow}>
                    <div className={styles.projectRowHeader}>
                      <h4 className={styles.projectTitle}>{proj.title}</h4>
                      {proj.techStack && <span className={styles.techStackPill}>{proj.techStack}</span>}
                    </div>
                    {proj.bullets?.length > 0 && (
                      <p className={styles.projectDescription}>{proj.bullets.join(" ")}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className={styles.emptyText}>No projects generated.</p>
              )}
            </div>
          )}

          {learnTab === "certificates" && (
            <div className={styles.cardGrid}>
              {certifications.length > 0 ? (
                certifications.map((cert, i) => (
                  <div key={i} className={styles.certCard}>
                    <div>
                      <h4 className={styles.certName}>{cert.name}</h4>
                      <p className={styles.certIssuer}>{cert.issuer}</p>
                    </div>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent((cert.name || "") + " " + (cert.issuer || "") + " enroll")}`}
                      target="_blank" rel="noreferrer" className={styles.courseBtn}
                    >
                      Find Enrollment
                    </a>
                  </div>
                ))
              ) : (
                <p className={styles.emptyText}>No certificates recommended.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {missingFields.length > 0 && (
        <div className={styles.missingInfoSection}>
          <div className={styles.missingHeader}>
            <h3>Missing Information</h3>
            <p>These fields show as "N/A" on your resume. Fill them in, or ignore to remove them entirely.</p>
          </div>

          <div className={styles.missingForm}>
            {missingFields.map((field) => (
              <div className={styles.inputGroup} key={field.id}>
                <label>{field.label}</label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={missingValues[field.id] || ""}
                  onChange={(e) => setMissingValues({ ...missingValues, [field.id]: e.target.value })}
                />
                <button type="button" className={styles.ignoreBtn} disabled={isRegenerating} onClick={() => handleIgnore(field.id)}>
                  Ignore
                </button>
              </div>
            ))}

            <div className={styles.missingActions}>
              <button className={styles.saveProfileBtn} disabled={isRegenerating} onClick={handleSaveAndRegenerate}>
                {isRegenerating ? "Regenerating..." : "Save Profile & Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.saveJobSection}>
        <button className={styles.saveJobBtn} onClick={() => navigate("/saved-jobs")}>Save Application</button>
      </div>
    </div>
  );
};

export default ResultDashboard;