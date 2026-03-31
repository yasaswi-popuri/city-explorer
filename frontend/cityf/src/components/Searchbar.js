import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function SearchBar({ token, setToken, setIsLoggedIn }) {
  const [cityName, setCityName] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!token) {
      setError("Please login to search for cities");
      return;
    }
    
    if (!cityName.trim()) {
      setError("Please enter a city name");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await axios.post("http://localhost:3030/search",
        { cityName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      console.error("Search error:", err.response?.data || err.message);
      console.error("Full error:", err);
      
      let errorMessage = "Error fetching city information";
      
      if (err.response?.status === 403) {
        errorMessage = err.response?.data?.message || "Session expired. Please login again.";
        // Clear invalid token and redirect to login
        localStorage.removeItem('authToken');
        setToken(null);
        setIsLoggedIn(false);
        // Optional: redirect to login page
        window.location.href = '/login';
      } else if (err.response?.status === 404) {
        errorMessage = err.response?.data?.message || "City not found. Please try a different city name.";
      } else if (err.response?.status === 429) {
        errorMessage = "Too many requests. Please try again later.";
      } else if (err.response?.status === 500) {
        errorMessage = err.response?.data?.message || "Server error. Please try again.";
      } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!token) {
    return (
      <div className="search-section">
        <div className="auth-prompt">
          <h3>🔍 Discover Cities Around the World</h3>
          <p>Join CityExplorer to search for detailed information about any city, including popular attractions and local insights.</p>
          <div className="auth-prompt-buttons">
            <Link to="/login" className="auth-prompt-btn primary">Login</Link>
            <Link to="/register" className="auth-prompt-btn secondary">Sign Up</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="search-section">
        <div className="search-container">
          <h1 className="search-title">🌍 Explore Cities</h1>
          
          <div className="search-bar">
            <input
              type="text"
              placeholder="Enter city name (e.g., Paris, Tokyo, New York)"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button 
              onClick={handleSearch} 
              className="search-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </button>
          </div>

          {error && (
            <div style={{ 
              color: '#dc2626', 
              textAlign: 'center', 
              padding: '1rem', 
              background: '#fef2f2', 
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="results-section">
          <div className="city-result">
            <div className="result-badge">City Found</div>
            
            <div className="city-header">
              <div className="city-info">
                <h2>{result.wiki.title}</h2>
                {result.wiki.description && (
                  <p className="city-description">{result.wiki.description}</p>
                )}
              </div>
              {result.wiki.image && (
                <img 
                  src={result.wiki.image} 
                  alt={result.wiki.title} 
                  className="city-image"
                />
              )}
            </div>
            
            <div className="search-stats">
              <div className="stat-item">
                <span className="stat-number">{result.popularAreas?.length || 0}</span>
                <span className="stat-label">Attractions</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{cityName.length}</span>
                <span className="stat-label">Characters</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{new Date().toLocaleTimeString()}</span>
                <span className="stat-label">Search Time</span>
              </div>
            </div>
            
            {result.wiki.summary && (
              <div className="city-summary">
                <p>{result.wiki.summary}</p>
              </div>
            )}

            {result.popularAreas && result.popularAreas.length > 0 && (
              <div className="attractions-section">
                <h3 className="attractions-header">🎯 Popular Attractions</h3>
                <div className="attractions-grid">
                  {result.popularAreas.map((area, i) => (
                    <div key={i} className="attraction-card">
                      {area.image && (
                        <img 
                          src={area.image} 
                          alt={area.title} 
                          className="attraction-image"
                        />
                      )}
                      <h4 className="attraction-title">{area.title}</h4>
                      <p className="attraction-summary">{area.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!result.popularAreas || result.popularAreas.length === 0) && (
              <div className="no-attractions">
                <h4>🔍 No attractions found</h4>
                <p>We couldn't find specific attractions for {result.wiki.title}, but you can still explore the city's general information above.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
