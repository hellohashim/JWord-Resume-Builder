import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar2.module.css';

const Navbar2 = () => {
  const linkClass = ({ isActive }) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

  return (
    <nav className={styles.navbar}>
      <div className={styles.logoContainer}>
        <span className={styles.logoText}>J-Word</span>
      </div>

      <div className={styles.navLinks}>
        <NavLink to="/" className={linkClass}>Home</NavLink>
        <NavLink to="/account" className={linkClass}>Account Details</NavLink>
        <NavLink to="/build" className={linkClass}>Build CV</NavLink>
        {/* Removed the old duplicate "Dashboard" link -- it pointed to the
            exact same /saved-jobs route as this one, just with different
            text. There's no separate generic "dashboard" view; a specific
            job's dashboard only exists once you pick one from Saved Jobs. */}
        <NavLink to="/saved-jobs" className={linkClass}>Saved Jobs</NavLink>
      </div>
    </nav>
  );
};

export default Navbar2;
