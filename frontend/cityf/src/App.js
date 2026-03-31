import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import SearchBar from './components/Searchbar';
import Login from './pages/Login';
import Register from './pages/Register';
import History from './pages/History';
import Profile from './pages/Profile';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);

  // Function to check if token is expired (simple check)
  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      // Simple JWT decode without library
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      const payload = JSON.parse(atob(parts[1]));
      if (!payload || !payload.exp) return true;
      
      // Check if token is expired (exp is in seconds)
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      console.error('Token decode error:', error);
      return true;
    }
  };

  // Function to clear expired token
  const clearExpiredToken = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken && !isTokenExpired(savedToken)) {
      setToken(savedToken);
      setIsLoggedIn(true);
    } else if (savedToken && isTokenExpired(savedToken)) {
      // Clear expired token
      clearExpiredToken();
    }
  }, []);

  return (
    <div className="App">
      {/* Animated Particles Background */}
      <div className="particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      <Router>
        <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} setToken={setToken} />
        <Routes>
          <Route path="/" element={<SearchBar isLoggedIn={isLoggedIn} token={token} setToken={setToken} setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setToken={setToken} />} />
          <Route path="/register" element={<Register setIsLoggedIn={setIsLoggedIn} setToken={setToken} />} />
          <Route path="/history" element={<History isLoggedIn={isLoggedIn} token={token} />} />
          <Route path="/profile" element={<Profile token={token} />} />
          <Route path="/search/:city" element={<h2>City Search Results Page</h2>} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
