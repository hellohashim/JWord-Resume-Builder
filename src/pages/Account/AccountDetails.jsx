import React, { useState, useEffect } from 'react';
import Card from '../../components/Shared/Card';
import styles from './Account.module.css';

const AccountDetails = () => {
  const [isParsing, setIsParsing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [errors, setErrors] = useState({});
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState('');

  const [formData, setFormData] = useState({
    personal: { name: '', email: '', phone: '', country: '', linkedin: '', github: '' },
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certificates: []
  });

  // --- FETCH DATA & DRAFTS ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dbData = await res.json();
        
        const localDraft = localStorage.getItem('resumeFormDraft');
        
        if (localDraft) {
          setFormData(JSON.parse(localDraft));
          setIsEditing(true);
          setLastSaved('Restored unsaved draft');
        } else if (res.ok) {
          setFormData(prev => ({
            personal: dbData.personal || prev.personal,
            skills: dbData.skills || [],
            education: dbData.education || [],
            experience: dbData.experience || [],
            projects: dbData.projects || [],
            certificates: dbData.certificates || []
          }));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // --- AUTO-SAVE ENGINE ---
  useEffect(() => {
    if (!isEditing || isLoading) return; 

    const autoSaveTimer = setTimeout(() => {
      localStorage.setItem('resumeFormDraft', JSON.stringify(formData));
      const now = new Date();
      setLastSaved(`Draft auto-saved at ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
    }, 1000); 

    return () => clearTimeout(autoSaveTimer);
  }, [formData, isEditing, isLoading]);

  // --- HANDLERS ---
  const handleUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setIsParsing(true);
      
      const uploadData = new FormData();
      uploadData.append('resume', file);

      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/resume/parse', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadData
        });

        const parsedData = await res.json();

        // CRITICAL FIX: Actually check if the backend threw an error!
        if (!res.ok) {
          throw new Error(parsedData.message || 'Failed to parse resume');
        }

        console.log("Success! Gemini returned:", parsedData);

        // Deep merge the data so it safely overwrites existing fields
        setFormData(prev => ({
          ...prev,
          personal: { ...prev.personal, ...(parsedData.personal || {}) },
          skills: parsedData.skills?.length ? parsedData.skills : prev.skills,
          education: parsedData.education?.length ? parsedData.education : prev.education,
          experience: parsedData.experience?.length ? parsedData.experience : prev.experience,
          projects: parsedData.projects?.length ? parsedData.projects : prev.projects,
          certificates: parsedData.certificates?.length ? parsedData.certificates : prev.certificates
        }));

      } catch (err) {
        console.error("Frontend Parsing Error:", err);
        alert(`Error parsing resume: ${err.message}. Check your backend terminal for details.`);
      } finally {
        setIsParsing(false);
        e.target.value = null; // Resets the file input
      }
    };

  const handlePersonalChange = (e) => {
    setFormData({ ...formData, personal: { ...formData.personal, [e.target.name]: e.target.value } });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const validateForm = () => {
    const newErrors = {};
    const { name, email, phone, linkedin } = formData.personal;

    if (!name?.trim() || !/^[a-zA-Z\s]+$/.test(name)) newErrors.name = 'Name must only contain letters and spaces.';
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email address.';
    if (phone && !/^\+\d{1,4}\s?\d{6,14}$/.test(phone)) newErrors.phone = 'Include country code (e.g., +92).';
    if (linkedin && !/^(https?:\/\/)?(www\.)?linkedin\.com\/.*$/.test(linkedin)) newErrors.linkedin = 'Must be a valid LinkedIn URL.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      alert('Validation failed. Please check the errors in red.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        localStorage.removeItem('resumeFormDraft');
        alert('Profile saved securely to database!');
        setIsEditing(false); 
        setLastSaved(''); 
      } else {
        alert('Failed to save profile.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving.');
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!isEditing) return;
    const skillText = newSkill.trim();
    if (!skillText) return;

    if (skillText.split(/\s+/).length > 3) {
      setErrors({ ...errors, skill: 'A skill cannot exceed 3 words.' });
      return;
    }
    if (formData.skills.includes(skillText)) {
      setErrors({ ...errors, skill: 'Skill already exists.' });
      return;
    }

    setFormData({ ...formData, skills: [...formData.skills, skillText] });
    setNewSkill('');
    setErrors({ ...errors, skill: null }); 
  };

  const handleRemoveSkill = (skillToRemove) => {
    if (!isEditing) return;
    setFormData({ ...formData, skills: formData.skills.filter(skill => skill !== skillToRemove) });
  };

  const handleArrayChange = (category, index, field, value) => {
    const updatedArray = [...formData[category]];
    updatedArray[index][field] = value;
    setFormData({ ...formData, [category]: updatedArray });
  };
  
  const addArrayItem = (category, emptyItem) => setFormData({ ...formData, [category]: [...formData[category], emptyItem] });
  const removeArrayItem = (category, index) => setFormData({ ...formData, [category]: formData[category].filter((_, i) => i !== index) });

  const toggleEditMode = () => {
    if (isEditing) {
      if(window.confirm("Are you sure? Unsaved changes will be lost.")) {
        localStorage.removeItem('resumeFormDraft');
        window.location.reload(); 
      }
    } else {
      setIsEditing(true);
    }
  };

  // --- CUSTOM DATE SELECTOR HELPER ---
  const renderDateSelector = (value, onChange, disabled) => {
    const currentYear = value ? value.split('-')[0] : '';
    const currentMonth = value ? value.split('-')[1] : '';

    const currentYearNum = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => currentYearNum - i + 5); // Allows up to 5 years in the future (for graduations)
    
    const months = [
      { val: '01', label: 'January' }, { val: '02', label: 'February' }, { val: '03', label: 'March' },
      { val: '04', label: 'April' }, { val: '05', label: 'May' }, { val: '06', label: 'June' },
      { val: '07', label: 'July' }, { val: '08', label: 'August' }, { val: '09', label: 'September' },
      { val: '10', label: 'October' }, { val: '11', label: 'November' }, { val: '12', label: 'December' }
    ];

    const handleMonthChange = (e) => {
      const newMonth = e.target.value;
      if (!newMonth && !currentYear) return onChange('');
      onChange(`${currentYear || currentYearNum}-${newMonth || '01'}`);
    };

    const handleYearChange = (e) => {
      const newYear = e.target.value;
      if (!newYear && !currentMonth) return onChange('');
      onChange(`${newYear || currentYearNum}-${currentMonth || '01'}`);
    };

    return (
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
        <select 
          disabled={disabled} 
          value={currentMonth} 
          onChange={handleMonthChange} 
          style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: disabled ? '#f9fafb' : 'white', fontFamily: 'inherit', fontSize: '0.95rem' }}
        >
          <option value="">Month</option>
          {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
        <select 
          disabled={disabled} 
          value={currentYear} 
          onChange={handleYearChange} 
          style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: disabled ? '#f9fafb' : 'white', fontFamily: 'inherit', fontSize: '0.95rem' }}
        >
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    );
  };

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading your profile...</div>;

  return (
    <div className={styles.accountContainer}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#111827' }}>My Account</h1>
          {isEditing && <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: '500' }}>{lastSaved}</span>}
        </div>
        <button 
          onClick={toggleEditMode}
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: isEditing ? '#fef2f2' : '#388087',
            color: isEditing ? '#dc2626' : 'white',
            border: isEditing ? '1px solid #f87171' : 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          {isEditing ? 'Cancel Editing' : 'Edit Profile'}
        </button>
      </div>

      {isEditing && (
        <Card>
          <h2>Step 1: Upload Existing CV</h2>
          <p className={styles.subtext}>Upload your PDF. Gemini will extract your details automatically.</p>
          <div className={styles.uploadArea}>
            <input type="file" accept="application/pdf" onChange={handleUpload} className={styles.fileInput} />
          </div>
          {isParsing && <p className={styles.parsingText}>Parsing data with Gemini...</p>}
        </Card>
      )}

      <Card>
        <h2>{isEditing ? 'Confirm & Edit Details' : 'Your Profile Data'}</h2>
        <form className={styles.profileForm}>
          
          {/* PERSONAL INFORMATION */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Personal Information</h3>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Full Name</label>
                <input disabled={!isEditing} name="name" value={formData.personal.name} onChange={handlePersonalChange} className={errors.name ? styles.inputError : ''} />
                {errors.name && <span className={styles.errorText}>{errors.name}</span>}
              </div>
              <div className={styles.inputGroup}>
                <label>Email</label>
                <input disabled={!isEditing} name="email" value={formData.personal.email} onChange={handlePersonalChange} className={errors.email ? styles.inputError : ''} />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Phone Number</label>
                <input disabled={!isEditing} name="phone" placeholder="+92 300 0000000" value={formData.personal.phone} onChange={handlePersonalChange} className={errors.phone ? styles.inputError : ''} />
                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
              </div>
              <div className={styles.inputGroup}>
                <label>Country</label>
                <input disabled={!isEditing} name="country" placeholder="e.g., Pakistan" value={formData.personal.country} onChange={handlePersonalChange} />
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>LinkedIn URL</label>
                <input disabled={!isEditing} name="linkedin" placeholder="linkedin.com/in/username" value={formData.personal.linkedin} onChange={handlePersonalChange} className={errors.linkedin ? styles.inputError : ''} />
                {errors.linkedin && <span className={styles.errorText}>{errors.linkedin}</span>}
              </div>
              <div className={styles.inputGroup}>
                <label>GitHub URL</label>
                <input disabled={!isEditing} name="github" placeholder="github.com/username" value={formData.personal.github} onChange={handlePersonalChange} />
              </div>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* SKILLS */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Skills</h3>
            <div className={styles.skillsWrapper}>
              <div className={styles.skillsList}>
                {formData.skills.map((skill, index) => (
                  <span key={index} className={styles.skillPill}>
                    {skill}
                    {isEditing && (
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className={styles.removeSkillBtn}>&times;</button>
                    )}
                  </span>
                ))}
              </div>
              
              {isEditing && (
                <div className={styles.addSkillContainer}>
                  <div className={styles.addSkillGroup}>
                    <input 
                      type="text" 
                      placeholder="e.g. React (Max 3 words)" 
                      value={newSkill} 
                      onChange={(e) => { setNewSkill(e.target.value); setErrors({...errors, skill: null}); }}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSkill(e)}
                      className={errors.skill ? styles.inputError : ''}
                    />
                    <button type="button" onClick={handleAddSkill} className={styles.addSkillBtn}>Add</button>
                  </div>
                  {errors.skill && <span className={styles.errorText}>{errors.skill}</span>}
                </div>
              )}
            </div>
          </div>

          <hr className={styles.divider} />

          {/* EDUCATION */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Education</h3>
            {formData.education.map((edu, idx) => (
              <div key={idx} className={styles.dynamicBlock}>
                {isEditing && <button type="button" onClick={() => removeArrayItem('education', idx)} className={styles.deleteBlockBtn}>&times;</button>}
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>University / Institution</label>
                    <input disabled={!isEditing} value={edu.university} onChange={(e) => handleArrayChange('education', idx, 'university', e.target.value)} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Degree</label>
                    <input disabled={!isEditing} value={edu.degree} onChange={(e) => handleArrayChange('education', idx, 'degree', e.target.value)} />
                  </div>
                </div>
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>Major</label>
                    <input disabled={!isEditing} value={edu.major} onChange={(e) => handleArrayChange('education', idx, 'major', e.target.value)} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>CGPA</label>
                    <input disabled={!isEditing} value={edu.cgpa} onChange={(e) => handleArrayChange('education', idx, 'cgpa', e.target.value)} />
                  </div>
                </div>
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>Start Date</label>
                    {/* Replaced with Custom Selector */}
                    {renderDateSelector(edu.startDate, (newVal) => handleArrayChange('education', idx, 'startDate', newVal), !isEditing)}
                  </div>
                  <div className={styles.inputGroup}>
                    <label>End Date</label>
                    {/* Replaced with Custom Selector */}
                    {renderDateSelector(edu.endDate, (newVal) => handleArrayChange('education', idx, 'endDate', newVal), !isEditing || (edu.graduated === false && !edu.endDate))}
                  </div>
                </div>
                <div className={styles.checkboxGroup}>
                  <input disabled={!isEditing} type="checkbox" id={`grad-${idx}`} checked={edu.graduated || false} onChange={(e) => handleArrayChange('education', idx, 'graduated', e.target.checked)} />
                  <label htmlFor={`grad-${idx}`}>I have graduated from this program</label>
                </div>
              </div>
            ))}
            {isEditing && (
              <button type="button" className={styles.addBlockBtn} onClick={() => addArrayItem('education', { university: '', degree: '', major: '', cgpa: '', startDate: '', endDate: '', graduated: false })}>
                + Add Education
              </button>
            )}
          </div>

          <hr className={styles.divider} />

          {/* EXPERIENCE */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Experience</h3>
            {formData.experience.map((exp, idx) => (
              <div key={idx} className={styles.dynamicBlock}>
                {isEditing && <button type="button" onClick={() => removeArrayItem('experience', idx)} className={styles.deleteBlockBtn}>&times;</button>}
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>Company</label>
                    <input disabled={!isEditing} value={exp.company} onChange={(e) => handleArrayChange('experience', idx, 'company', e.target.value)} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Role / Job Title</label>
                    <input disabled={!isEditing} value={exp.role} onChange={(e) => handleArrayChange('experience', idx, 'role', e.target.value)} />
                  </div>
                </div>
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>Start Date</label>
                    {/* Replaced with Custom Selector */}
                    {renderDateSelector(exp.startDate, (newVal) => handleArrayChange('experience', idx, 'startDate', newVal), !isEditing)}
                  </div>
                  <div className={styles.inputGroup}>
                    <label>End Date</label>
                    {/* Replaced with Custom Selector */}
                    {renderDateSelector(exp.endDate, (newVal) => handleArrayChange('experience', idx, 'endDate', newVal), !isEditing)}
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>Description & Achievements</label>
                  <textarea disabled={!isEditing} rows="3" value={exp.description} onChange={(e) => handleArrayChange('experience', idx, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            {isEditing && (
              <button type="button" className={styles.addBlockBtn} onClick={() => addArrayItem('experience', { company: '', role: '', startDate: '', endDate: '', description: '' })}>
                + Add Experience
              </button>
            )}
          </div>

          <hr className={styles.divider} />

          {/* PROJECTS */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Projects</h3>
            {formData.projects.map((proj, idx) => (
              <div key={idx} className={styles.dynamicBlock}>
                {isEditing && <button type="button" onClick={() => removeArrayItem('projects', idx)} className={styles.deleteBlockBtn}>&times;</button>}
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>Project Title</label>
                    <input disabled={!isEditing} value={proj.title} onChange={(e) => handleArrayChange('projects', idx, 'title', e.target.value)} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Tech Stack</label>
                    <input disabled={!isEditing} value={proj.techStack} onChange={(e) => handleArrayChange('projects', idx, 'techStack', e.target.value)} />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>Project Link (URL)</label>
                  <input disabled={!isEditing} value={proj.link} onChange={(e) => handleArrayChange('projects', idx, 'link', e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Description</label>
                  <textarea disabled={!isEditing} rows="2" value={proj.description} onChange={(e) => handleArrayChange('projects', idx, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            {isEditing && (
              <button type="button" className={styles.addBlockBtn} onClick={() => addArrayItem('projects', { title: '', techStack: '', description: '', link: '' })}>
                + Add Project
              </button>
            )}
          </div>

          <hr className={styles.divider} />

          {/* CERTIFICATES */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Certifications</h3>
            {formData.certificates.map((cert, idx) => (
              <div key={idx} className={styles.dynamicBlock}>
                {isEditing && <button type="button" onClick={() => removeArrayItem('certificates', idx)} className={styles.deleteBlockBtn}>&times;</button>}
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>Certificate Name</label>
                    <input disabled={!isEditing} value={cert.name} onChange={(e) => handleArrayChange('certificates', idx, 'name', e.target.value)} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Issuer / Organization</label>
                    <input disabled={!isEditing} value={cert.issuer} onChange={(e) => handleArrayChange('certificates', idx, 'issuer', e.target.value)} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Date Received</label>
                    {/* Kept as exact date since certificates are usually awarded on a specific day */}
                    <input disabled={!isEditing} type="date" value={cert.date} onChange={(e) => handleArrayChange('certificates', idx, 'date', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            {isEditing && (
              <button type="button" className={styles.addBlockBtn} onClick={() => addArrayItem('certificates', { name: '', issuer: '', date: '' })}>
                + Add Certificate
              </button>
            )}
          </div>

          {/* SAVE BUTTON */}
          {isEditing && (
            <div className={styles.formFooter} style={{ marginTop: '2rem' }}>
              <button type="button" className={styles.saveBtn} onClick={handleSaveProfile}>
                Save Profile Data to Database
              </button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};

export default AccountDetails;