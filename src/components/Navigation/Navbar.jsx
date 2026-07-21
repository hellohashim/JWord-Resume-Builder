import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isAuthenticated = !!localStorage.getItem('token');

  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('resumeFormDraft');
    setIsDropdownOpen(false);
    navigate('/login');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logoContainer}>
        <h1 className={styles.logoText}>J-Word</h1>
      </div>

      <div className={styles.navLinks}>
        <NavLink
          to="/"
          className={({ isActive }) => isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
        >
          Home
        </NavLink>

        {isAuthenticated ? (
          <div className={styles.profileContainer}>
            <button
              className={styles.avatarBtn}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles.avatarIcon}>
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className={styles.dropdown}>
                <Link to="/account" className={styles.dropdownItem}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.dropdownIcon}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Dashboard
                </Link>

                <div className={styles.dropdownDivider}></div>

                <button onClick={handleLogout} className={styles.logoutBtn}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.dropdownIcon}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.authLinks}>
            <Link to="/login" className={styles.loginBtn}>Login</Link>
            <Link to="/signup" className={styles.signupBtn}>Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
