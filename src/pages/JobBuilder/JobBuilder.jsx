import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './JobBuilder.module.css';

const TEMPLATES = [
  { id: 'classic', name: 'Classic', description: 'Clean serif headings, tight spacing.', image: '/template-previews/classic.png' },
  { id: 'nit_srinagar', name: 'Boxed Sections', description: 'Two-column header, structured bars.', image: '/template-previews/nit_srinagar.png' },
  { id: 'minimalist', name: 'Minimalist', description: 'Sans-serif with generous whitespace.', image: '/template-previews/minimalist.png' },
  { id: 'elegant', name: 'Elegant', description: 'Centered serif, small-caps, deep accent.', image: '/template-previews/elegant.png' },
  { id: 'modern_sidebar', name: 'Modern Bold', description: 'Large bold name, colored highlights.', image: '/template-previews/modern_sidebar.JPG' },
  { id: 'compact_ats', name: 'ATS Safe', description: 'Zero icons, maximum parser compatibility.', image: '/template-previews/compact_ats.png' },
  { id: 'harvard', name: 'Harvard', description: 'The classic academic/MBA format.', image: '/template-previews/harvard.png' },
  { id: 'deedy_lite', name: 'Deedy', description: 'Bold teal headers, strong typography.', image: '/template-previews/deedy_lite.png' },
  { id: 'awesome_cv_lite', name: 'Awesome Blue', description: 'Bold color-block section headers.', image: '/template-previews/awesome_cv_lite.png' },
];

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const DocIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12h-9m9-3.75h-9m3-8.25H8.25a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25V9.75c0-.618-.245-1.216-.68-1.65l-3.42-3.42a2.25 2.25 0 00-1.591-.659z" />
  </svg>
);

const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
    <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-.354.353a.75.75 0 101.06 1.06l.354-.353zM5.404 15.657a.75.75 0 001.06-1.06l-.353-.354a.75.75 0 10-1.06 1.06l.353.354zM18 10a.75.75 0 01-.75.75h-.5a.75.75 0 010-1.5h.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-.5a.75.75 0 010-1.5h.5A.75.75 0 015 10zM15.657 14.596a.75.75 0 001.06 1.06l-.353.354a.75.75 0 00-1.06-1.06l.353-.354zM5.404 4.343a.75.75 0 00-1.06 1.06l.353.354a.75.75 0 001.06-1.06l-.353-.354z" clipRule="evenodd" />
  </svg>
);

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" width="16" height="16">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
  </svg>
);

const JobBuilder = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    jobDescription: '',
  });

  const [fieldErrors, setFieldErrors] = useState({ companyName: false, jobDescription: false });
  const [shakeFields, setShakeFields] = useState(false);
  const [generatingTemplateId, setGeneratingTemplateId] = useState(null);
  const detailsRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: false });
    }
  };

  const validateFields = () => {
    const errors = {
      companyName: !formData.companyName.trim(),
      jobDescription: !formData.jobDescription.trim(),
    };
    setFieldErrors(errors);
    return !errors.companyName && !errors.jobDescription;
  };

  const handleUseTemplate = async (templateId) => {
    if (!validateFields()) {
      setShakeFields(true);
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setShakeFields(false), 500);
      return;
    }

    setGeneratingTemplateId(templateId);

    try {
      const token = localStorage.getItem('token');

      const profileRes = await fetch('http://localhost:5000/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!profileRes.ok) {
        throw new Error("Could not fetch your saved profile from the database.");
      }

      const savedProfile = await profileRes.json();

      const res = await fetch('http://localhost:5000/api/resume/tailor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          jobDescription: formData.jobDescription,
          template: templateId,
          userProfile: savedProfile
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to tailor resume');
      }

      const result = await res.json();
      localStorage.setItem('tailoredData', JSON.stringify(result.data));
      navigate(`/dashboard/${result.jobId}`);

    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setGeneratingTemplateId(null);
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.builderContainer}>

        <div className={styles.heroHeader}>
          <span className={styles.stepBadge}>
            <SparkleIcon />
            Step 2 of 3
          </span>
          <h2>Target Your Resume</h2>
          <p>Tell us about the role, then pick a design — we'll tailor everything to match instantly.</p>
        </div>

        <div ref={detailsRef} className={`${styles.detailsCard} ${shakeFields ? styles.shake : ''}`}>
          <div className={styles.detailsGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span className={styles.fieldIcon}><BuildingIcon /></span>
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g. Google, Microsoft, Devsinc..."
                className={`${styles.fieldInput} ${fieldErrors.companyName ? styles.fieldInputError : ''}`}
              />
              {fieldErrors.companyName && <span className={styles.fieldErrorText}>Please enter the company name</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span className={styles.fieldIcon}><DocIcon /></span>
                Job Description
              </label>
              <textarea
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleChange}
                rows="6"
                placeholder="Paste the full job posting here — requirements, responsibilities, everything..."
                className={`${styles.fieldTextarea} ${fieldErrors.jobDescription ? styles.fieldInputError : ''}`}
              ></textarea>
              {fieldErrors.jobDescription && <span className={styles.fieldErrorText}>Please paste the job description</span>}
            </div>
          </div>
        </div>

        <div className={styles.templateSection}>
          <div className={styles.templateSectionHeader}>
            <h3>Choose Your Design</h3>
            <p>Hover a resume and click <strong>Use This Template</strong> to generate instantly.</p>
          </div>

          <div className={styles.templateGrid}>
            {TEMPLATES.map((tpl) => {
              const isGenerating = generatingTemplateId === tpl.id;
              const isDisabled = generatingTemplateId !== null;
              return (
                <div key={tpl.id} className={styles.templateCard}>
                  <div className={styles.templateImageWrap}>
                    <img
                      src={tpl.image}
                      alt={`${tpl.name} resume template preview`}
                      className={styles.templateImage}
                      loading="lazy"
                    />
                    <div className={styles.templateOverlay}>
                      <button
                        type="button"
                        className={styles.useTemplateBtn}
                        disabled={isDisabled}
                        onClick={() => handleUseTemplate(tpl.id)}
                      >
                        {isGenerating ? (
                          <>
                            <span className={styles.btnSpinner}></span>
                            Generating...
                          </>
                        ) : (
                          <>
                            Use This Template
                            <ArrowIcon />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className={styles.templateLabel}>
                    <span className={styles.templateName}>{tpl.name}</span>
                    <span className={styles.templateDescription}>{tpl.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default JobBuilder;