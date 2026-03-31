import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function ProfileDropdown({ isLoggedIn, setIsLoggedIn, setToken }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setIsLoggedIn(false);
    navigate('/');
    setOpen(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-links">
        <Link to="/login" className="login-btn">Login</Link>
        <Link to="/register" className="register-btn">Register</Link>
      </div>
    );
  }

  return (
    <div className="profile-dropdown">
      <button onClick={() => setOpen(!open)} className="profile-btn">
        👤 Profile
      </button>
      {open && (
        <ul className="dropdown-menu">
          <li><Link to="/profile" onClick={() => setOpen(false)}>My Account</Link></li>
          <li><button onClick={handleLogout} className="logout-btn">Logout</button></li>
        </ul>
      )}
    </div>
  );
}

export default ProfileDropdown;
