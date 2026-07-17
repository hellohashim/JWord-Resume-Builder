import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SavedJobs.module.css';

const API_BASE = 'http://localhost:5000';

const SavedJobs = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState('');
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE}/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setJobs(await res.json());
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div className={styles.savedContainer}>
      <div className={styles.header}>
        <h2>Saved Applications</h2>
        <p className={styles.subtitle}>Review your generated resumes and learning paths.</p>
      </div>

      <div className={styles.jobList}>
        {isLoading && <p>Loading…</p>}
        {!isLoading && jobs.length === 0 && <p>No saved applications yet. Build one from Build CV!</p>}
        {jobs.map((job) => (
          <div key={job._id} className={styles.jobCard}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.jobTitle}>{job.companyName || 'Untitled Application'}</h3>
              </div>
              <span className={styles.dateBadge}>
                {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.detailBox}>
                <p>{(job.jobDescription || '').slice(0, 160)}...</p>
              </div>
              <button className={styles.viewBtn} onClick={() => navigate(`/dashboard/${job._id}`)}>
                View Dashboard &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.feedbackSection}>
        <div className={styles.feedbackBox}>
          <label>Help us improve! Share your feedback.</label>
          <textarea rows="3" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What could make ResuMatch better?" />
        </div>
      </div>
    </div>
  );
};

export default SavedJobs;