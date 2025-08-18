const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Data storage
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeJsonSync(USERS_FILE, {});
}

// Load users data
function loadUsers() {
  try {
    return fs.readJsonSync(USERS_FILE);
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
}

// Save users data
function saveUsers(users) {
  try {
    fs.writeJsonSync(USERS_FILE, users, { spaces: 2 });
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Initialize medical chart for new user
function initializeMedicalChart() {
  return {
    skinType: null,
    skinConcerns: [],
    allergies: [],
    currentProducts: [],
    skinHistory: [],
    environmentalFactors: [],
    lifestyleFactors: [],
    lastUpdated: new Date().toISOString()
  };
}

// Update medical chart based on user input
function updateMedicalChart(medicalChart, userInput) {
  const updatedChart = { ...medicalChart };
  
  // Extract skin type information
  const skinTypeKeywords = {
    'oily': ['oily', 'greasy', 'shiny', 'acne-prone'],
    'dry': ['dry', 'flaky', 'tight', 'rough'],
    'combination': ['combination', 't-zone', 'mixed'],
    'sensitive': ['sensitive', 'redness', 'irritation', 'burning'],
    'normal': ['normal', 'balanced', 'healthy']
  };

  const inputLower = userInput.toLowerCase();
  
  // Update skin type
  for (const [skinType, keywords] of Object.entries(skinTypeKeywords)) {
    if (keywords.some(keyword => inputLower.includes(keyword))) {
      updatedChart.skinType = skinType;
      break;
    }
  }

  // Extract skin concerns
  const concernKeywords = {
    'acne': ['acne', 'pimples', 'breakouts', 'zits'],
    'aging': ['aging', 'wrinkles', 'fine lines', 'anti-aging'],
    'hyperpigmentation': ['dark spots', 'hyperpigmentation', 'melasma', 'sun spots'],
    'rosacea': ['rosacea', 'redness', 'flushing'],
    'eczema': ['eczema', 'dermatitis', 'itchy'],
    'dryness': ['dry', 'dehydrated', 'flaky'],
    'sensitivity': ['sensitive', 'irritation', 'burning', 'stinging']
  };

  for (const [concern, keywords] of Object.entries(concernKeywords)) {
    if (keywords.some(keyword => inputLower.includes(keyword)) && 
        !updatedChart.skinConcerns.includes(concern)) {
      updatedChart.skinConcerns.push(concern);
    }
  }

  // Extract allergies
  const allergyKeywords = ['allergic', 'allergy', 'reaction', 'break out'];
  if (allergyKeywords.some(keyword => inputLower.includes(keyword))) {
    // Extract potential allergens from the text
    const allergenPatterns = [
      /(?:allergic to|allergy to|reacts to)\s+([^.,]+)/gi,
      /(?:can't use|cannot use|avoid)\s+([^.,]+)/gi
    ];
    
    allergenPatterns.forEach(pattern => {
      const matches = [...userInput.matchAll(pattern)];
      matches.forEach(match => {
        const allergen = match[1].trim().toLowerCase();
        if (!updatedChart.allergies.includes(allergen)) {
          updatedChart.allergies.push(allergen);
        }
      });
    });
  }

  updatedChart.lastUpdated = new Date().toISOString();
  return updatedChart;
}

// Generate medical chart summary for API
function generateMedicalChartSummary(medicalChart) {
  let summary = "PATIENT SKIN PROFILE:\n";
  
  if (medicalChart.skinType) {
    summary += `- Skin Type: ${medicalChart.skinType}\n`;
  }
  
  if (medicalChart.skinConcerns.length > 0) {
    summary += `- Primary Concerns: ${medicalChart.skinConcerns.join(', ')}\n`;
  }
  
  if (medicalChart.allergies.length > 0) {
    summary += `- Known Allergies/Reactions: ${medicalChart.allergies.join(', ')}\n`;
  }
  
  if (medicalChart.currentProducts.length > 0) {
    summary += `- Current Products: ${medicalChart.currentProducts.join(', ')}\n`;
  }
  
  if (medicalChart.environmentalFactors.length > 0) {
    summary += `- Environmental Factors: ${medicalChart.environmentalFactors.join(', ')}\n`;
  }
  
  if (medicalChart.lifestyleFactors.length > 0) {
    summary += `- Lifestyle Factors: ${medicalChart.lifestyleFactors.join(', ')}\n`;
  }
  
  return summary;
}

// Call Perplexity API
async function callPerplexityAPI(userQuery, medicalChart) {
  try {
    const medicalSummary = generateMedicalChartSummary(medicalChart);
    
    const prompt = `You are a professional dermatologist and skincare expert. Use the following patient information to provide personalized, evidence-based skincare advice:

${medicalSummary}

PATIENT QUESTION: ${userQuery}

Please provide:
1. A personalized response based on the patient's skin profile
2. Specific product recommendations (if applicable)
3. Lifestyle and routine suggestions
4. Any warnings or contraindications based on their allergies/sensitivities
5. When to consult a dermatologist

Keep your response professional, informative, and tailored to their specific skin concerns.`;

    const response = await axios.post(process.env.PERPLEXITY_API_URL, {
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "You are a professional dermatologist and skincare expert with extensive knowledge of skin conditions, treatments, and product recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Perplexity API:', error.response?.data || error.message);
    throw new Error('Failed to get skincare advice. Please try again.');
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create or get user session
app.post('/api/session', (req, res) => {
  const users = loadUsers();
  const { userId } = req.body;
  
  if (userId && users[userId]) {
    // Existing user
    res.json({ userId, medicalChart: users[userId] });
  } else {
    // New user
    const newUserId = uuidv4();
    const newMedicalChart = initializeMedicalChart();
    users[newUserId] = newMedicalChart;
    saveUsers(users);
    res.json({ userId: newUserId, medicalChart: newMedicalChart });
  }
});

// Update medical chart
app.post('/api/update-chart', (req, res) => {
  const { userId, userInput } = req.body;
  
  if (!userId || !userInput) {
    return res.status(400).json({ error: 'User ID and input are required' });
  }
  
  const users = loadUsers();
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const updatedChart = updateMedicalChart(users[userId], userInput);
  users[userId] = updatedChart;
  saveUsers(users);
  
  res.json({ medicalChart: updatedChart });
});

// Get skincare advice
app.post('/api/advice', async (req, res) => {
  const { userId, question } = req.body;
  
  if (!userId || !question) {
    return res.status(400).json({ error: 'User ID and question are required' });
  }
  
  const users = loadUsers();
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  try {
    const advice = await callPerplexityAPI(question, users[userId]);
    res.json({ advice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's medical chart
app.get('/api/chart/:userId', (req, res) => {
  const { userId } = req.params;
  const users = loadUsers();
  
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ medicalChart: users[userId] });
});

// Update specific chart fields
app.put('/api/chart/:userId', (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  
  const users = loadUsers();
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const updatedChart = { ...users[userId], ...updates, lastUpdated: new Date().toISOString() };
  users[userId] = updatedChart;
  saveUsers(users);
  
  res.json({ medicalChart: updatedChart });
});

// Start server
app.listen(PORT, () => {
  console.log(`AI Skincare Assistant running on http://localhost:${PORT}`);
  console.log('Make sure to set up your PERPLEXITY_API_KEY in the .env file');
}); 