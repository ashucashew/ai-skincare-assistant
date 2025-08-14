# AI Skincare Assistant

A personalized AI-powered skincare assistant that builds a 'medical chart' of the user, understanding their specific concerns and skin type. Connects to Perplexity API.


## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Perplexity API key

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd ai-skincare-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Perplexity API key:
   ```
   PERPLEXITY_API_KEY=your_actual_api_key_here
   ```

4. **Build CSS (optional - for development)**
   ```bash
   npm run build:css
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## How It Works

### Medical Chart System
The assistant automatically extracts and categorizes information from your conversations:

- **Skin Type**: Detects oily, dry, combination, sensitive, or normal skin
- **Skin Concerns**: Identifies acne, aging, hyperpigmentation, rosacea, eczema, etc.
- **Allergies**: Extracts allergy information and product reactions
- **Current Products**: Tracks products you're currently using
- **Environmental Factors**: Notes climate, pollution, sun exposure
- **Lifestyle Factors**: Considers diet, stress, sleep patterns

### Personalized Responses
Every time you ask a question, the assistant:
1. Updates your medical chart with new information from your message
2. Sends your question + medical chart summary to Perplexity API
3. Receives personalized advice based on your complete skin profile
4. Provides specific recommendations and warnings based on your allergies

## API Endpoints

- `POST /api/session` - Create or retrieve user session
- `POST /api/update-chart` - Update medical chart with user input
- `POST /api/advice` - Get personalized skincare advice
- `GET /api/chart/:userId` - Retrieve user's medical chart
- `PUT /api/chart/:userId` - Update specific chart fields

### Profile Updates
Use the "Quick Profile Update" section to directly update your skin profile:
- "I live in a humid climate"
- "I'm currently using CeraVe cleanser and Neutrogena sunscreen"
- "I have sensitive skin that reacts to fragrances"

## Development

### Project Structure
```
ai-skincare-assistant/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── env.example           # Environment variables template
├── public/               # Frontend assets
│   ├── index.html        # Main HTML file
│   ├── css/              # Stylesheets
│   │   ├── input.css     # Tailwind input
│   │   └── output.css    # Compiled CSS
│   └── js/               # JavaScript files
│       └── app.js        # Main frontend logic
├── data/                 # User data storage
│   └── users.json        # Medical charts and user data
└── README.md             # This file
```

### Available Scripts
- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm run build:css` - Build Tailwind CSS
- `npm run build` - Build CSS and watch for changes

## Customization

### Adding New Skin Types
Edit the `skinTypeKeywords` object in `server.js`:
```javascript
const skinTypeKeywords = {
  'oily': ['oily', 'greasy', 'shiny', 'acne-prone'],
  'dry': ['dry', 'flaky', 'tight', 'rough'],
  // Add new skin types here
};
```

### Adding New Concerns
Edit the `concernKeywords` object in `server.js`:
```javascript
const concernKeywords = {
  'acne': ['acne', 'pimples', 'breakouts', 'zits'],
  // Add new concerns here
};
```

## Disclaimer
This application provides general skincare advice and should not replace professional medical consultation. Always consult with a dermatologist for serious skin concerns or before starting new treatments. 
