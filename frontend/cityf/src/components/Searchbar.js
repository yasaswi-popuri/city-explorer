import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useNotifications } from '../context/NotificationContext';

export default function SearchBar({ token, setToken, setIsLoggedIn }) {
  const { triggerNotification } = useNotifications();
  const [cityName, setCityName] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [climateData, setClimateData] = useState(null);
  const [previousNotifications, setPreviousNotifications] = useState([]);
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

  const openAttractionModal = (attraction, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Dynamic modal sizing based on viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 768;
    
    const modalWidth = isMobile ? Math.min(400, viewportWidth - 40) : Math.min(450, viewportWidth - 40);
    const modalHeight = isMobile ? Math.min(500, viewportHeight - 100) : Math.min(450, viewportHeight - 100);
    const margin = 20;
    
    let top, left;
    
    // Calculate horizontal position
    if (isMobile) {
      // Center horizontally on mobile
      left = scrollLeft + (viewportWidth - modalWidth) / 2;
    } else {
      // Position near clicked card on desktop
      left = rect.left + scrollLeft;
      
      // Adjust if modal goes off right edge
      if (left + modalWidth > scrollLeft + viewportWidth - margin) {
        left = scrollLeft + viewportWidth - modalWidth - margin;
      }
      
      // Adjust if modal goes off left edge
      if (left < scrollLeft + margin) {
        left = scrollLeft + margin;
      }
    }
    
    // Calculate vertical position with smart positioning
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    if (spaceBelow >= modalHeight + margin) {
      // Show below the card (preferred)
      top = rect.bottom + scrollTop + margin;
    } else if (spaceAbove >= modalHeight + margin) {
      // Show above the card
      top = rect.top + scrollTop - modalHeight - margin;
    } else {
      // Not enough space either way, center in viewport
      top = scrollTop + (viewportHeight - modalHeight) / 2;
    }
    
    // Ensure modal stays within viewport bounds
    top = Math.max(scrollTop + margin, Math.min(top, scrollTop + viewportHeight - modalHeight - margin));
    left = Math.max(scrollLeft + margin, Math.min(left, scrollLeft + viewportWidth - modalWidth - margin));
    
    setModalPosition({ top, left, width: modalWidth, height: modalHeight });
    setSelectedAttraction(attraction);
  };

  const closeAttractionModal = () => {
    setSelectedAttraction(null);
  };

  // Request notification permission and send browser notification
  const sendWeatherNotification = async (city, notifications) => {
    // Request permission if not granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    // Only send notifications if permission is granted
    if (Notification.permission === 'granted' && notifications.length > 0) {
      // Filter out notifications we haven't sent before
      const newNotifications = notifications.filter(notification => {
        const notificationKey = `${city}-${notification.type}-${notification.message}`;
        return !previousNotifications.includes(notificationKey);
      });
      
      // Send each new notification
      newNotifications.forEach((notification, index) => {
        setTimeout(() => {
          const notificationTitle = `Weather Alert for ${city}`;
          const notificationOptions = {
            body: notification.message,
            icon: notification.type === 'extreme_heat' ? 'https://cdn-icons-png.flaticon.com/512/423/423122.png' :
                  notification.type === 'extreme_cold' ? 'https://cdn-icons-png.flaticon.com/512/614/614825.png' :
                  notification.type === 'temperature_change' ? 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png' :
                  'https://cdn-icons-png.flaticon.com/512/414/414927.png',
            tag: `${city}-${notification.type}`,
            requireInteraction: notification.severity === 'danger'
          };
          
          const browserNotification = new Notification(notificationTitle, notificationOptions);
          
          // Auto-close notification after 5 seconds (except danger notifications)
          if (notification.severity !== 'danger') {
            setTimeout(() => {
              browserNotification.close();
            }, 5000);
          }
        }, index * 1000); // Stagger notifications by 1 second
      });
      
      // Update previous notifications
      const newNotificationKeys = newNotifications.map(notification => 
        `${city}-${notification.type}-${notification.message}`
      );
      setPreviousNotifications(prev => [...prev, ...newNotificationKeys]);
    }
  };

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
      
      // Fetch climate data for the city
      try {
        const climateRes = await axios.get(`http://localhost:3030/climate/predict?city=${encodeURIComponent(cityName)}&days=3`);
        if (climateRes.data.success) {
          setClimateData(climateRes.data.data);
          
          // Send browser notifications for weather changes
          if (climateRes.data.data.notifications && climateRes.data.data.notifications.length > 0) {
            await sendWeatherNotification(cityName, climateRes.data.data.notifications);
            // Trigger notification bell in navbar
            triggerNotification();
          }
        }
      } catch (climateErr) {
        console.warn("Climate data fetch failed:", climateErr.message);
        // Don't fail the search if climate data fails
      }
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
              placeholder="Enter city name"
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

            {climateData && (
              <div className="climate-prediction" style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
                borderRadius: '1rem',
                padding: '1.5rem',
                margin: '1.5rem 0',
                color: 'white',
                boxShadow: '0 10px 25px rgba(30, 58, 138, 0.4)',
                border: '2px solid rgba(99, 102, 241, 0.5)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'white' }}>
                    Weather Prediction for {climateData.city || cityName}
                  </h3>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    opacity: 0.9,
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    {climateData.model_type || 'AI-powered'}
                  </div>
                </div>
                
                {climateData.predictions && climateData.predictions.length > 0 ? (
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {climateData.predictions.map((pred, index) => (
                      <div key={index} style={{
                        minWidth: '120px',
                        textAlign: 'center',
                        background: pred.day_label === 'Today' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        border: pred.day_label === 'Today' ? '2px solid rgba(255, 255, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: pred.day_label === 'Today' ? '0 4px 15px rgba(255, 255, 255, 0.2)' : '0 2px 8px rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          {pred.day_label || 'Today'}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6b6b', marginBottom: '0.2rem' }}>
                          {pred.max_temp?.toFixed(1)}°
                        </div>
                        <div style={{ fontSize: '1rem', color: '#4ecdc4', marginBottom: '0.5rem' }}>
                          {pred.min_temp?.toFixed(1)}°
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                          {new Date(pred.readable_date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', opacity: 0.8 }}>
                    No climate data available for this city
                  </div>
                )}
                
                {climateData.notifications && climateData.notifications.length > 0 && (
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '0.5rem',
                padding: '1rem',
                margin: '1rem 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: '#d97706' }}>Weather Notifications</h4>
                  {Notification.permission === 'denied' && (
                    <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                      Notifications blocked in browser
                    </span>
                  )}
                  {Notification.permission === 'granted' && (
                    <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>
                      Browser notifications enabled
                    </span>
                  )}
                </div>
                {climateData.notifications.map((notification, index) => (
                  <div key={index} style={{
                    background: notification.severity === 'danger' ? 'rgba(220, 38, 38, 0.2)' :
                               notification.severity === 'warning' ? 'rgba(245, 158, 11, 0.2)' :
                               'rgba(59, 130, 246, 0.2)',
                    border: `1px solid ${
                      notification.severity === 'danger' ? '#dc2626' :
                      notification.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                    }`,
                    borderRadius: '0.25rem',
                    padding: '0.75rem',
                    margin: '0.5rem 0',
                    color: 'white',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {notification.type === 'extreme_heat' ? '🔥 Extreme Heat' :
                       notification.type === 'extreme_cold' ? '🥶 Cold Alert' :
                       notification.type === 'temperature_change' ? '🌡️ Temperature Change' :
                       notification.type === 'forecast_change' ? '📈 Forecast Change' : '🌡️ Weather'}
                    </div>
                    <div>{notification.message}</div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '1rem', textAlign: 'center' }}>
                  {climateData.location_context || 'AI-powered weather forecast'}
                </div>
              </div>
            )}

            {result.popularAreas && result.popularAreas.length > 0 && (
              <div className="attractions-section">
                <h3 className="attractions-header">Popular Attractions</h3>
                <div className="attractions-grid">
                  {result.popularAreas.map((area, i) => (
                    <div key={i} className="attraction-card" onClick={(e) => openAttractionModal(area, e)}>
                      {area.image && (
                        <img 
                          src={area.image} 
                          alt={area.title} 
                          className="attraction-image"
                        />
                      )}
                      <div className="attraction-content">
                        <h4 className="attraction-title">{area.title}</h4>
                        <div className="attraction-summary-container">
                          <p className="attraction-summary">
                            {area.summary && area.summary.length > 150 
                              ? `${area.summary.substring(0, 150)}...` 
                              : area.summary || 'Explore this popular destination in the city.'}
                          </p>
                          {area.summary && area.summary.length > 150 && (
                            <button 
                              className="expand-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAttractionModal(area, e);
                              }}
                            >
                              Read More
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!result.popularAreas || result.popularAreas.length === 0) && (
              <div className="no-attractions">
                <h4> No attractions found</h4>
                <p>We couldn't find specific attractions for {result.wiki.title}, but you can still explore the city's general information above.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attraction Modal */}
      {selectedAttraction && (
        <div className="modal-overlay" onClick={closeAttractionModal}>
          <div 
            className="attraction-modal attraction-modal-positioned" 
            style={{
              position: 'absolute',
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
              width: `${modalPosition.width}px`,
              maxHeight: `${modalPosition.height}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{selectedAttraction.title}</h2>
              <button className="modal-close" onClick={closeAttractionModal}>×</button>
            </div>
            <div className="modal-content">
              {selectedAttraction.image && (
                <img 
                  src={selectedAttraction.image} 
                  alt={selectedAttraction.title} 
                  className="modal-image"
                />
              )}
              <div className="modal-description">
                <p>{selectedAttraction.summary || 'Explore this popular destination in the city.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
