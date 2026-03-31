// models/search.js
const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  cityName: String,                     // which city they searched
  popularAreas: [String],               // list of attractions/areas they opened
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('search', searchSchema);
