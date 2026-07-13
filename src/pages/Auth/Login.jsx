import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';

const Login = () => {
  const navigate = useNavigate();
  
  // State initialized as empty strings so the form is blank on load
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Send login data to Express backend
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to log in');
      }

      // Save the JWT token to keep the user logged in
      localStorage.setItem('token', data.token);
      
      // Redirect to the account dashboard
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
        <h2>Welcome Back</h2>
        <p>Log in to access your tailored resumes.</p>
        
        {/* Display errors (like "Invalid email or password") */}
        {error && <div style={{ color: 'red', marginBottom: '1rem', backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '4px' }}>{error}</div>}

        {/* autoComplete="off" on the form helps stop aggressive browser autofill */}
        <form className={styles.authForm} onSubmit={handleSubmit} autoComplete="off">
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
              placeholder="Enter your password" 
              value={formData.password}
              onChange={handleChange}
              required 
              autoComplete="new-password" // Tricks Chrome into leaving this blank
            />
          </div>
          
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <p className={styles.switchAuth}>
          Don't have an account? <Link to="/signup">Sign up for free</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;