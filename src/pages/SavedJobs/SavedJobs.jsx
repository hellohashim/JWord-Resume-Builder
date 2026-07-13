import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Shared/Card';
import styles from './SavedJobs.module.css';

const SavedJobs = () => {
  const navigate = useNavigate();

  // Mock data representing the "JobApplication" MongoDB documents
  const savedJobsList = [
    { id: '101', title: 'Frontend Developer', company: 'TechCorp', date: 'Oct 24, 2026' },
    { id: '102', title: 'MERN Stack Engineer', company: 'Startup Inc', date: 'Oct 22, 2026' },
    { id: '103', title: 'React Native Dev', company: 'Mobile Solutions', date: 'Oct 15, 2026' },
  ];

  const handleCardClick = (jobId) => {
    // Navigate to the Dashboard populated with this specific job's data
    navigate(`/dashboard/${jobId}`);
  };

  return (
    <div className={styles.savedContainer}>
      <h2>Your Saved Job Applications</h2>
      <p className={styles.helperText}>Click on a job to view the tailored resume and your personalized learning path.</p>

      <div className={styles.jobGrid}>
        {savedJobsList.map((job) => (
          <Card key={job.id} className={styles.jobCard}>
            <div onClick={() => handleCardClick(job.id)} className={styles.clickableArea}>
              <h3>{job.title}</h3>
              <p className={styles.company}>{job.company}</p>
              <div className={styles.cardFooter}>
                <span className={styles.date}>Created: {job.date}</span>
                <span className={styles.viewLink}>View Details &rarr;</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedJobs;