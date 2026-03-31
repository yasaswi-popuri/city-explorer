const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hash this in real apps
  searchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'search' }],
  settings: {
    privacy: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    language: { type: String, enum: ['english', 'spanish', 'french', 'german', 'chinese'], default: 'english' },
    notifications: { type: Boolean, default: true },
    showSearchHistory: { type: Boolean, default: true }
  }
});

module.exports = mongoose.model('user', userSchema);