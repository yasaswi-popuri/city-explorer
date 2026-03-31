import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function History({ token }) {
  const [searchHistory, setSearchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3030/user/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('History data received:', res.data);
      setSearchHistory(res.data);
    } catch (err) {
      console.error('History fetch error:', err);
      setError('Failed to load search history');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token, fetchHistory]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date error';
    }
  };

  if (!token) {
    return (
      <div className="search-section">
        <div className="auth-prompt">
          <h3>📚 Please Login to View History</h3>
          <p>Your search history is only available when you're logged in.</p>
          <div className="auth-prompt-buttons">
            <a href="/login" className="auth-prompt-btn primary">Login</a>
            <a href="/register" className="auth-prompt-btn secondary">Sign Up</a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="search-section">
        <div className="search-container">
          <div className="loading">
            <span className="loading-spinner"></span>
            Loading your search history...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-section">
        <div className="search-container">
          <div style={{ 
            color: '#dc2626', 
            textAlign: 'center', 
            padding: '2rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.75rem'
          }}>
            <h4>❌ {error}</h4>
            <button 
              onClick={fetchHistory}
              className="search-btn"
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-section">
      <div className="search-container">
        <h1 className="search-title">📚 Your Search History</h1>
        
        {searchHistory.length === 0 ? (
          <div className="no-attractions">
            <h4>🔍 No Search History Yet</h4>
            <p>Start exploring cities to build your search history! Your recent searches will appear here.</p>
          </div>
        ) : (
          <div className="history-list">
            {searchHistory.map((search, index) => {
              console.log('Rendering search item:', search);
              return (
                <div key={search._id} className="history-item">
                  <div className="history-content">
                    <h4>🌍 {search.cityName}</h4>
                    <p className="history-date">Searched on {formatDate(search.timestamp || search.createdAt)}</p>
                  </div>
                  <div className="history-index">
                    <span className="result-badge">#{searchHistory.length - index}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
