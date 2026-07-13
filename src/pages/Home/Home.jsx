import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';

// Custom hand-drawn style looping arrow component
const LoopyArrow = () => (
  <div className={styles.arrowContainer}>
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.loopyArrow}>
      {/* Hand-drawn loop path */}
      <path 
        d="M -10,50 C 30,90 80,10 50,10 C 20,10 10,60 50,80 C 75,90 90,70 105,50" 
        stroke="#388087" 
        strokeWidth="4" 
        strokeLinecap="round" 
        className={styles.arrowPath}
      />
      {/* Arrowhead */}
      <path 
        d="M 85,35 L 105,50 L 85,65" 
        stroke="#388087" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={styles.arrowHead}
      />
    </svg>
  </div>
);

const Home = () => {
  const headline = "Build your career with ResuMatch, the AI-powered resume builder.";
  const words = headline.split(" ");

  const steps = [
    {
      title: "Step 1",
      description: "Upload existing CV or fill account details. Confirm the form by clicking save."
    },
    {
      title: "Step 2",
      description: "Copy the JD from LinkedIn or Indeed & paste it in the builder."
    },
    {
      title: "Step 3",
      description: "Choose the template and build your CV."
    },
    {
      title: "Step 4",
      description: "Edit your CV by giving chat instructions and download your CV & cover letter."
    }
  ];

  return (
    <div className={styles.homeContainer}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.textContent}>
          <h1 className={styles.title}>
            {words.map((word, index) => (
              <span 
                key={index} 
                className={styles.animatedWord} 
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {word}
              </span>
            ))}
          </h1>
          <p className={styles.subtitle}>
            Upload your resume, paste a Job Description, and let our system generate a tailored, LaTeX-perfect CV in seconds—for free.
          </p>
          <div className={styles.ctaGroup}>
            <Link to="/build" className={styles.primaryBtn}>Build your CV Now</Link>
            <Link to="/account" className={styles.secondaryBtn}>Upload Existing CV</Link>
          </div>
        </div>

        {/* Right Side Visual Scanner */}
        <div className={styles.visualContent}>
          <div className={styles.resumeCard}>
            <div className={styles.skeletonHeader}></div>
            <div className={styles.skeletonLine} style={{ width: '80%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '60%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '90%' }}></div>
            <div className={styles.skeletonLine} style={{ width: '40%' }}></div>
            <div className={styles.scannerLine}></div>
          </div>
        </div>
      </div>

      {/* Redesigned How It Works Section */}
      <div className={styles.howItWorksSection}>
        <h2 className={styles.sectionTitle}>Create your Resume with just 4 steps</h2>
        
        <div className={styles.stepsFlexContainer}>
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              
              {/* Elongated Step Card */}
              <div className={styles.stepCard} style={{ animationDelay: `${index * 0.2}s` }}>
                <div className={styles.stepHeader}>
                  <h3>{step.title}</h3>
                </div>
                <div className={styles.stepBody}>
                  <p>{step.description}</p>
                </div>
              </div>

              {/* Render the loopy arrow between cards */}
              {index < steps.length - 1 && <LoopyArrow />}
              
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Ad Space */}
      <div className={styles.adSpace}>
        <p>Ads</p>
      </div>
    </div>
  );
};

export default Home;