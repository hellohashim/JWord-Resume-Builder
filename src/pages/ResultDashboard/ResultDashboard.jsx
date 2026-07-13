import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './ResultDashboard.module.css';

const ResultDashboard = () => {
  const { jobId } = useParams(); // Fetch specific job data using this ID later
  const [activeTab, setActiveTab] = useState('edit');

  return (
    <div className={styles.dashboardContainer}>
      
      {/* Top Section: PDF Preview */}
      <div className={styles.previewSection}>
        <h2>Your Tailored Resume {jobId ? `(Job ID: ${jobId})` : ''}</h2>
        <div className={styles.pdfViewer}>
          <p>[ PDF rendered from LaTeX container goes here ]</p>
        </div>
        <button className={styles.downloadBtn}>Download PDF</button>
      </div>

      {/* Bottom Section: Interactive Tabs */}
      <div className={styles.interactiveSection}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'edit' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            Edit via Chatbot
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'learn' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('learn')}
          >
            Things to Learn
          </button>
        </div>

        {/* Tab Content: Chatbot */}
        {activeTab === 'edit' && (
          <div className={styles.tabContent}>
            <p>Tell Gemini what to change. Pressing enter regenerates the PDF instantly.</p>
            <div className={styles.chatWindow}>
              <div className={styles.chatMessage}><strong>AI:</strong> How can I tweak this resume for you?</div>
            </div>
            <div className={styles.chatInputArea}>
              <input type="text" placeholder="e.g. 'Add more focus on my MERN stack projects'" />
              <button>Send</button>
            </div>
          </div>
        )}

        {/* Tab Content: Learning / YouTube API */}
        {activeTab === 'learn' && (
          <div className={styles.tabContent}>
            <p>Missing skills detected from the JD. Here are top-rated tutorials to prep for the interview:</p>
            <ul className={styles.learningList}>
              <li>
                <strong>System Design:</strong> 
                <a href="#" target="_blank" rel="noreferrer">Watch YouTube Crash Course</a>
              </li>
              <li>
                <strong>TypeScript:</strong> 
                <a href="#" target="_blank" rel="noreferrer">Watch YouTube Crash Course</a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultDashboard;