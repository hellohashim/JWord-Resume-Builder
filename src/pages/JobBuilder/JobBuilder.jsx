import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './JobBuilder.module.css';

const JobBuilder = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    companyName: '',
    jobDescription: '',
    template: 'classic' 
  });
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTemplateSelect = (templateName) => {
    setFormData({ ...formData, template: templateName });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // 1. Fetch your securely saved profile from the database!
      const profileRes = await fetch('http://localhost:5000/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!profileRes.ok) {
        throw new Error("Could not fetch your saved profile from the database.");
      }
      
      const savedProfile = await profileRes.json();

      // 2. Send the data to the tailoring AI
      const res = await fetch('http://localhost:5000/api/resume/tailor', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          jobDescription: formData.jobDescription,
          template: formData.template, 
          userProfile: savedProfile 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to tailor resume');
      }

      const result = await res.json();
      console.log("AI Output:", result);

      // 3. SAVE DATA FOR THE DASHBOARD
      localStorage.setItem('tailoredData', JSON.stringify(result.data));
      
      // THIS IS THE CRITICAL ADDITION: Save inputs so Dashboard can regenerate!
      navigate(`/dashboard/${result.jobId}`);

      

    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`); 
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.builderContainer}>
      <h2>Step 2: Target Your Resume</h2>
      <p>Paste the Job Description and select a LaTeX template.</p>

      <form onSubmit={handleGenerate} className={styles.builderForm}>
        <div className={styles.formSection}>
          <label>Company Name</label>
          <input 
            type="text" 
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="e.g. Google, Microsoft..." 
            required 
          />
        </div>

        <div className={styles.formSection}>
          <label>Paste Job Description (JD)</label>
          <textarea 
            name="jobDescription"
            value={formData.jobDescription}
            onChange={handleChange}
            rows="10" 
            placeholder="Paste the full job requirements here..." 
            required
          ></textarea>
        </div>

        <div className={styles.formSection}>
          <label>Choose LaTeX Template</label>
          <div className={styles.templateGrid} style={{ display: 'flex', gap: '1rem', marginTop: '10px' }}>
            
            <div 
              onClick={() => handleTemplateSelect('classic')}
              style={{
                padding: '1rem',
                border: formData.template === 'classic' ? '2px solid #388087' : '1px solid #ccc',
                backgroundColor: formData.template === 'classic' ? '#eefafb' : 'white',
                cursor: 'pointer',
                borderRadius: '8px',
                flex: 1,
                textAlign: 'center'
              }}
            >
              <strong>Template 1 (Classic)</strong>
            </div>

            <div 
              onClick={() => handleTemplateSelect('modern')}
              style={{
                padding: '1rem',
                border: formData.template === 'modern' ? '2px solid #388087' : '1px solid #ccc',
                backgroundColor: formData.template === 'modern' ? '#eefafb' : 'white',
                cursor: 'pointer',
                borderRadius: '8px',
                flex: 1,
                textAlign: 'center'
              }}
            >
              <strong>Template 2 (Modern)</strong>
            </div>

          </div>
        </div>

        <button type="submit" className={styles.generateBtn} disabled={isGenerating}>
          {isGenerating ? 'Generating LaTeX...' : 'Generate Tailored Resume'}
        </button>
      </form>
    </div>
  );
};

export default JobBuilder;