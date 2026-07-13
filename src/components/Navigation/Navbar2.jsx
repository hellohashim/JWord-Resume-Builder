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
        <Link to="/saved">Saved Jobs</Link>
      </div>
    </nav>
  );
};

export default Navbar2;