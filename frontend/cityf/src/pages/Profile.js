import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function Profile({ token }) {
  const [profileData, setProfileData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      console.log('Fetching profile with token:', token);
      const response = await axios.get('http://localhost:3030/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Profile data received:', response.data);
      setProfileData(response.data);
      setFormData({
        username: response.data.username,
        email: response.data.email
      });
    } catch (err) {
      console.error('Profile fetch error:', err.response?.data || err.message);
      setError('Failed to load profile data');
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleEdit = () => {
    setEditMode(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditMode(false);
    if (profileData) {
      setFormData({
        username: profileData.username,
        email: profileData.email
      });
    }
    setError('');
    setSuccess('');
  };

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    console.log('Saving profile:', formData);
    console.log('Token:', token);
    
    try {
      const response = await axios.put('http://localhost:3030/user/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Profile save response:', response.data);
      
      setProfileData(response.data.user);
      setEditMode(false);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Profile save error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }, [formData, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('Form field changed:', { name, value });
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!profileData && !editMode) {
    return (
      <div className="search-section">
        <div className="search-container">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-section">
      <div className="search-container">
        <div className="profile-header">
          <h1 className="search-title">👤 My Profile</h1>
          {!editMode && (
            <button className="edit-btn" onClick={handleEdit}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {success && (
          <div className="success-message">{success}</div>
        )}

        <div className="profile-content">
          <div className="profile-section">
            <h2>📝 Account Information</h2>
            {editMode ? (
              <form onSubmit={handleSave} className="profile-form">
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" disabled={loading} className="save-btn">
                    {loading ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button type="button" onClick={handleCancel} className="cancel-btn">
                    ❌ Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-item">
                  <label>Username:</label>
                  <span>{profileData.username}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>{profileData.email}</span>
                </div>
                <div className="info-item">
                  <label>Member Since:</label>
                  <span>{new Date(profileData.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="profile-section">
            <h2>📊 Search Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{profileData.searchCount}</div>
                <div className="stat-label">Cities Searched</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">156</div>
                <div className="stat-label">Places Explored</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">28</div>
                <div className="stat-label">Countries</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
