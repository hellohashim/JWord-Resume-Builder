import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './JobBuilder.module.css';

const JobBuilder = () => {
  const navigate = useNavigate();

  const handleGenerate = (e) => {
    e.preventDefault();
    // Logic to trigger Gemini generation goes here later
    // Navigate to dashboard and pass the new jobId in the URL
    navigate('/dashboard/new-job-123'); 
  };

  return (
    <div className={styles.builderContainer}>
      <h2>Step 2: Target Your Resume</h2>
      <p>Paste the Job Description and select a LaTeX template.</p>

      <form onSubmit={handleGenerate} className={styles.builderForm}>
        <div className={styles.formSection}>
          <label>Company Name</label>
          <input type="text" placeholder="e.g. Google, Microsoft..." required />
        </div>

        <div className={styles.formSection}>
          <label>Paste Job Description (JD)</label>
          <textarea rows="10" placeholder="Paste the full job requirements here..." required></textarea>
        </div>

        <div className={styles.formSection}>
          <label>Choose LaTeX Template</label>
          <div className={styles.templateGrid}>
            <div className={styles.templateCard}>Template 1 (Classic)</div>
            <div className={styles.templateCard}>Template 2 (Modern)</div>
            <div className={styles.templateCard}>Template 3 (Tech)</div>
          </div>
        </div>

        <button type="submit" className={styles.generateBtn}>Generate Tailored Resume</button>
      </form>
    </div>
  );
};

export default JobBuilder;