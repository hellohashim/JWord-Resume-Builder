import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Navbar2.module.css';

const Navbar2 = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navLinks}>
        <Link to="/">Home</Link>
        <Link to="/account">Account Details</Link>
        <Link to="/build">Build CV</Link>
        {/* Added Dashboard Link - Using 'latest' as a placeholder jobId */}
        <Link to="/saved-jobs">Dashboard</Link> 
        <Link to="/saved-jobs">Saved Jobs</Link>
      </div>
    </nav>
  );
};

export default Navbar2;