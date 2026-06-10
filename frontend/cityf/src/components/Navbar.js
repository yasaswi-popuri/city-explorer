import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProfileDropdown from './ProfileDropdown';

function Navbar({ isLoggedIn, setIsLoggedIn, setToken }) {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">CityExplorer</Link>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        {isLoggedIn && <li><Link to="/history">History</Link></li>}
      </ul>
      <ProfileDropdown 
        isLoggedIn={isLoggedIn} 
        setIsLoggedIn={setIsLoggedIn} 
        setToken={setToken} 
      />
    </nav>
  );
}

export default Navbar;
