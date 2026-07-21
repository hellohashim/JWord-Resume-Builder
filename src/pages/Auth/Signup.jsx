import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';

const Signup = () => {
  const navigate = useNavigate();
  
  // Clean state ready for new users
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic Validation to ensure passwords match
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsLoading(true);

    try {
      // Send data to your Express backend
      const response = await fetch('https://jword-resume-builder.onrender.com/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // Save the JWT token to local storage so the user stays logged in
      localStorage.setItem('token', data.token);
      
      // Redirect user to their account or dashboard after successful signup
      navigate('/account');

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>Create an Account</h2>
        <p>Sign up to save your resumes and job matches.</p>
        
        {/* Display errors if they occur (e.g. Email already exists) */}
        {error && <div style={{ color: 'red', marginBottom: '1rem', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '4px' }}>{error}</div>}
        
        {/* autoComplete="off" prevents ghost data from filling the form */}
        <form className={styles.authForm} onSubmit={handleSubmit} autoComplete="off">
          <div className={styles.inputGroup}>
            <label>Full Name</label>
            <input 
              type="text" 
              name="name" 
              placeholder="John Doe" 
              value={formData.name}
              onChange={handleChange}
              required 
              autoComplete="off"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input 
              type="email" 
              name="email" 
              placeholder="Enter your email" 
              value={formData.email}
              onChange={handleChange}
              required 
              autoComplete="off"
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              type="password" 
              name="password" 
              placeholder="Create a password" 
              value={formData.password}
              onChange={handleChange}
              required 
              minLength="6"
              autoComplete="new-password" // Critical for stopping autofill
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Confirm Password</label>
            <input 
              type="password" 
              name="confirmPassword" 
              placeholder="Confirm your password" 
              value={formData.confirmPassword}
              onChange={handleChange}
              required 
              autoComplete="new-password"
            />
          </div>
          
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className={styles.switchAuth}>
          Already have an account? <Link to="/login">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;