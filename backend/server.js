const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const JWT_SECRET = process.env.JWT_SECRET || "SECRET_KEY";

// Connect to MongoDB
async function main() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/CitiesDb');
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
}
main();

// Models
const User = require('./models/user');
const Search = require('./models/search');

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('Auth header:', authHeader);
  console.log('Extracted token:', token);
  
  if (!token) return res.status(401).json({ message: "Token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification failed:", err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: "Token expired. Please login again." });
      }
      return res.status(403).json({ message: "Invalid token. Please login again." });
    }
    console.log('JWT verified user:', user);
    req.user = user;
    next();
  });
}

// Register
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    const savedUser = await newUser.save();
    res.status(201).json({ message: "User registered successfully", user: savedUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user profile
app.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      searchCount: user.searchHistory?.length || 0
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// Update user profile
app.put('/user/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.userId;
    
    // Check if username/email already exists
    const existingUser = await User.findOne({ 
      _id: { $ne: userId },
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username ? "Username already exists" : "Email already exists" 
      });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log('Profile update successful:', updatedUser);
    
    res.json({
      message: "Profile updated successfully",
      user: {
        username: updatedUser.username,
        email: updatedUser.email
      }
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Get user settings
app.get('/user/settings', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('settings');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      settings: user.settings || {
        privacy: 'public',
        theme: 'light',
        language: 'english',
        notifications: true,
        showSearchHistory: true
      }
    });
  } catch (err) {
    console.error("Settings fetch error:", err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// Update user settings
app.put('/user/settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    const userId = req.user.userId;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { settings },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      message: "Settings updated successfully",
      settings
    });
  } catch (err) {
    console.error("Settings update error:", err);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// Search route (Wikipedia city + attractions)
app.post('/search', authenticateToken, async (req, res) => {
  const { cityName } = req.body;
  console.log(`🔍 Search request for city: "${cityName}"`);

  try {
    // Save search history
    const newSearch = new Search({ user: req.user.userId, cityName });
    const savedSearch = await newSearch.save();
    await User.findByIdAndUpdate(req.user.userId, { $push: { searchHistory: savedSearch._id } });

    // Step 1: Wikipedia summary for city
    console.log(`📖 Fetching Wikipedia summary for: ${cityName}`);
    let wikiData;
    try {
      const wikiResponse = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cityName.replace(/\s+/g, "_"))}`,
        { headers: { "User-Agent": "CityExplorerApp/1.0 (https://github.com/yasaswi-popuri)" } }
      );
      wikiData = wikiResponse.data;
      console.log(`✅ Wikipedia summary fetched: ${wikiData.title}`);
    } catch (err) {
      console.warn(`⚠️ Wikipedia API failed, using fallback: ${err.message}`);
      // Fallback data if Wikipedia fails
      wikiData = {
        title: cityName,
        description: "City information temporarily unavailable",
        summary: `We're currently unable to fetch detailed information about ${cityName} from Wikipedia. This might be due to API limitations or network issues. Please try again later.`,
        extract: `Information about ${cityName} is currently unavailable. Our systems are experiencing difficulties accessing Wikipedia data. Please try your search again in a few moments.`,
        thumbnail: null
      };
    }

    // Step 2: Fetch full Wikipedia page HTML
    console.log(`📄 Fetching Wikipedia page links for: ${cityName}`);
    let pageData;
    try {
      const pageResponse = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(cityName)}&prop=links&format=json`,
        { headers: { "User-Agent": "CityExplorerApp/1.0 (https://github.com/yasaswi-popuri)" } }
      );
      pageData = pageResponse.data;
    } catch (err) {
      console.warn(`⚠️ Failed to fetch page links for ${cityName}: ${err.message}`);
      pageData = { parse: { links: [] } }; // Empty fallback
    }

    // Step 3: Extract linked articles (filter for attractions/tourism keywords)
    const links = pageData.parse.links
      .map(l => l['*'])
      .filter(name =>
        /Beach|Park|Museum|Temple|Palace|Fort|Village|Zoo|Garden|Tower|Market|Monument|Attraction/i.test(name)
      )
      .slice(0, 5); // limit to top 5 attractions

    console.log(`🎯 Found ${links.length} potential attractions`);

    // Step 4: Fetch summaries for each attraction
    const popularAreas = [];
    for (const place of links) {
      try {
        console.log(`🏛️️ Fetching attraction: ${place}`);
        const placeResponse = await axios.get(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.replace(/\s+/g, "_"))}`,
          { headers: { "User-Agent": "CityExplorerApp/1.0 (https://github.com/yasaswi-popuri)" } }
        );
        popularAreas.push({
          title: placeResponse.data.title,
          summary: placeResponse.data.extract,
          image: placeResponse.data.thumbnail ? placeResponse.data.thumbnail.source : null
        });
      } catch (err) {
        console.warn(`⚠️ Failed to fetch summary for ${place}:`, err.response?.status || err.message);
      }
    }

    // Final response
    console.log(`✅ Search completed for ${cityName}`);
    res.json({
      wiki: {
        title: wikiData.title,
        description: wikiData.description,
        summary: wikiData.extract,
        image: wikiData.thumbnail ? wikiData.thumbnail.source : null
      },
      popularAreas,
      searchSaved: savedSearch
    });
  } catch (err) {
    console.error("❌ Error in /search route:", err.response?.status, err.response?.data || err.message);
    
    // Send more specific error messages
    let errorMessage = "Error fetching city information";
    let statusCode = 500;
    
    if (err.response?.status === 404) {
      errorMessage = `City "${cityName}" not found on Wikipedia. Please try a different city name.`;
      statusCode = 404;
    } else if (err.response?.status === 429) {
      errorMessage = "Too many requests to Wikipedia. Please try again later.";
      statusCode = 429;
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMessage = "Network error. Please check your internet connection.";
      statusCode = 503;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage, 
      error: err.message,
      citySearched: cityName 
    });
  }
});

// Get user search history
app.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('searchHistory');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.searchHistory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Climate prediction route
app.get('/climate/predict', async (req, res) => {
  try {
    const city = req.query.city || '';
    console.log('Fetching climate prediction from ML API...', city ? `for city: ${city}` : '');
    
    const mlUrl = city 
      ? `http://127.0.0.1:5000/predict?city=${encodeURIComponent(city)}`
      : 'http://127.0.0.1:5000/predict';
    
    const response = await axios.get(mlUrl);
    
    console.log('Climate prediction received:', response.data);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (err) {
    console.error('Climate prediction error:', err.message);
    
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        success: false, 
        message: 'Climate prediction service is currently unavailable. Please try again later.' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch climate prediction. Please try again later.' 
      });
    }
  }
});

app.get('/', (req, res) => {
  res.send('Server started');
});

app.listen(3030, () => {
  console.log('🚀 Server started on port 3030');
});
