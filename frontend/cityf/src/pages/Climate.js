import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import '../App.css';

const Climate = () => {
  const location = useLocation();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [cityContext, setCityContext] = useState('');

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching climate prediction...');
      
      const apiUrl = cityContext 
        ? `http://localhost:3030/climate/predict?city=${encodeURIComponent(cityContext)}`
        : 'http://localhost:3030/climate/predict';
      
      const response = await axios.get(apiUrl);
      console.log('Climate prediction response:', response.data);
      
      if (response.data.success) {
        setPrediction(response.data.data);
        setLastUpdated(new Date().toLocaleString());
      } else {
        setError(response.data.message || 'Failed to fetch prediction');
      }
    } catch (err) {
      console.error('Climate prediction error:', err);
      setError(err.response?.data?.message || 'Failed to fetch climate prediction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Extract city from URL if present
    const pathSegments = location.pathname.split('/');
    let city = '';
    if (pathSegments.length > 2 && pathSegments[1] === 'climate') {
      city = pathSegments[2];
      if (city) {
        city = city.charAt(0).toUpperCase() + city.slice(1);
        setCityContext(city);
      }
    }
    
    fetchPrediction();
    
    // Refresh prediction every 5 minutes
    const interval = setInterval(fetchPrediction, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [location.pathname, cityContext]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTemperatureColor = (temp) => {
    if (temp < 10) return '#3498db'; // Blue for cold
    if (temp < 20) return '#2ecc71'; // Green for mild
    if (temp < 30) return '#f39c12'; // Orange for warm
    return '#e74c3c'; // Red for hot
  };

  if (loading && !prediction) {
    return (
      <div className="climate-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading climate prediction...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="climate-container">
      <div className="climate-header">
        <h1>
          Climate Prediction 
          {cityContext && <span className="city-context"> for {cityContext}</span>}
        </h1>
        <p>AI-powered temperature forecasting using Prophet models</p>
        {lastUpdated && (
          <span className="last-updated">Last updated: {lastUpdated}</span>
        )}
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchPrediction} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {prediction && (
        <div className="prediction-card">
          <div className="prediction-header">
            <h2>Tomorrow's Forecast</h2>
            <p className="prediction-date">
              {prediction.readable_date || formatDate(prediction.date)}
            </p>
          </div>

          <div className="temperature-grid">
            <div className="temp-card max-temp">
              <div className="temp-icon">thermometer_high</div>
              <div className="temp-info">
                <h3>Maximum Temperature</h3>
                <p 
                  className="temp-value"
                  style={{ color: getTemperatureColor(prediction.max_temp) }}
                >
                  {prediction.max_temp.toFixed(1)}°C
                </p>
              </div>
            </div>

            <div className="temp-card min-temp">
              <div className="temp-icon">thermometer_low</div>
              <div className="temp-info">
                <h3>Minimum Temperature</h3>
                <p 
                  className="temp-value"
                  style={{ color: getTemperatureColor(prediction.min_temp) }}
                >
                  {prediction.min_temp.toFixed(1)}°C
                </p>
              </div>
            </div>
          </div>

          <div className="prediction-info">
            <div className="info-item">
              <span className="info-label">Temperature Range:</span>
              <span className="info-value">
                {(prediction.max_temp - prediction.min_temp).toFixed(1)}°C
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Average Temperature:</span>
              <span className="info-value">
                {((prediction.max_temp + prediction.min_temp) / 2).toFixed(1)}°C
              </span>
            </div>
          </div>

          <button 
            onClick={fetchPrediction} 
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Prediction'}
          </button>
        </div>
      )}

      <div className="climate-footer">
        <p>
          <strong>Model Information:</strong> Predictions are generated using Facebook's Prophet 
          time series forecasting model trained on historical climate data.
        </p>
        <p>
          <strong>Accuracy:</strong> These predictions are for educational purposes and may not 
          reflect actual weather conditions.
        </p>
      </div>
    </div>
  );
};

export default Climate;
