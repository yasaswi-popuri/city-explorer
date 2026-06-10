import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Register({ setIsLoggedIn, setToken }) {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch('http://localhost:3030/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Account created successfully! Signing you in...');
      
        setTimeout(async () => {
          try {
            const loginRes = await fetch('http://localhost:3030/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email, password: formData.password }),
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) {
              localStorage.setItem('authToken', loginData.token);
              setToken(loginData.token);
              setIsLoggedIn(true);
              navigate('/');
            } else {
              setError('Account created but login failed. Please sign in manually.');
              navigate('/login');
            }
          } catch (loginErr) {
            console.error('Auto-login error:', loginErr);
            setError('Account created but auto-login failed. Please sign in manually.');
            navigate('/login');
          }
        }, 1500);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      if (!success) setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>🚀 Create Account</h2>
      <p className="subtitle">Join CityExplorer and discover amazing places</p>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          onChange={handleChange}
          value={formData.username}
          required
          disabled={loading || success}
          minLength={3}
        />
        <input
          type="email"
          name="email"
          placeholder="Email address"
          onChange={handleChange}
          value={formData.email}
          required
          disabled={loading || success}
        />
        <input
          type="password"
          name="password"
          placeholder="Password (min 6 characters)"
          onChange={handleChange}
          value={formData.password}
          required
          disabled={loading || success}
          minLength={6}
        />
        <button type="submit" disabled={loading || success}>
          {loading ? 'Creating account...' : success ? 'Redirecting...' : 'Create Account'}
        </button>
      </form>
      
      <div className="form-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}

export default Register;
