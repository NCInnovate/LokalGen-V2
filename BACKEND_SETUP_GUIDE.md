# 🚀 LokalGen Backend Setup Guide
## AI Story Generation Integration

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Setup](#environment-setup)
4. [Backend Implementation](#backend-implementation)
5. [AI Integration Options](#ai-integration-options)
6. [Database Setup](#database-setup)
7. [API Endpoints](#api-endpoints)
8. [Deployment](#deployment)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide provides step-by-step instructions for integrating real AI-powered story generation into LokalGen. The backend will:

- ✅ Receive story parameters from `story-studio.html`
- ✅ Process requests through an LLM (Large Language Model)
- ✅ Store generated stories in a database
- ✅ Return stories to the frontend
- ✅ Manage user sessions and rate limiting
- ✅ Handle error management and logging

---

## 🏗️ Architecture

### System Flow

```
Frontend (story-studio.html)
         ↓
    HTTP Request
         ↓
Backend API (Node.js/Python)
         ↓
AI Provider (OpenAI/Claude/HuggingFace)
         ↓
Generated Story
         ↓
Database (MongoDB/PostgreSQL)
         ↓
Return to Frontend
         ↓
Display in story-studio.html
```

### Tech Stack Recommendations

**Frontend:** HTML, CSS, JavaScript (already built)  
**Backend:** Node.js with Express or Python with Flask/FastAPI  
**AI Provider:** OpenAI API, Anthropic Claude, or HuggingFace  
**Database:** MongoDB (flexible) or PostgreSQL (structured)  
**Hosting:** Heroku, Railway, Render, or AWS Lambda  

---

## 💻 Environment Setup

### Prerequisites

- Node.js (v16+) or Python (v3.8+)
- npm or pip (package managers)
- Git
- GitHub account
- API key from AI provider (OpenAI, Claude, etc.)
- Database account (MongoDB Atlas, PostgreSQL, etc.)

### Step 1: Create Backend Repository

```bash
# Create new directory
mkdir lokalgen-backend
cd lokalgen-backend

# Initialize git
git init
git add origin https://github.com/NCInnovate/LokalGen-Backend.git

# Initialize Node project
npm init -y
# OR for Python:
# python -m venv venv
# source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 2: Install Dependencies

**For Node.js:**
```bash
npm install express dotenv cors axios mongoose
npm install --save-dev nodemon
```

**For Python:**
```bash
pip install flask python-dotenv flask-cors requests pymongo
```

### Step 3: Environment Variables

Create `.env` file (never commit this):

```env
# Server
PORT=5000
NODE_ENV=development

# AI Provider
OPENAI_API_KEY=sk-xxx...
# OR for Claude:
ANTHROPIC_API_KEY=sk-ant-xxx...
# OR for HuggingFace:
HUGGINGFACE_API_KEY=hf_xxx...

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lokalgen
# OR for PostgreSQL:
DATABASE_URL=postgresql://user:pass@localhost:5432/lokalgen

# CORS
FRONTEND_URL=http://localhost:3000
# For production:
FRONTEND_URL=https://NCInnovate.github.io/LokalGen-V2

# Rate Limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60
```

---

## 🔧 Backend Implementation

### Option 1: Node.js Express Backend

**File: `server.js`**

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

// Story Schema
const storySchema = new mongoose.Schema({
    title: String,
    season: Number,
    episode: Number,
    characters: String,
    theme: String,
    storyTypes: [String],
    supernatural: String,
    wordCount: String,
    content: String,
    metadata: Object,
    createdAt: { type: Date, default: Date.now },
    userEmail: String,
    tokens: Number
});

const Story = mongoose.model('Story', storySchema);

// Generate Story Endpoint
app.post('/api/generate-story', async (req, res) => {
    try {
        const {
            title,
            season,
            episode,
            characters,
            theme,
            storyTypes,
            supernatural,
            wordCount,
            details,
            email
        } = req.body;

        // Validate input
        if (!title || !season || !episode || !characters) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Build prompt for AI
        const prompt = buildStoryPrompt({
            title,
            season,
            episode,
            characters,
            theme,
            storyTypes,
            supernatural,
            wordCount,
            details
        });

        // Call AI API
        const story = await generateWithOpenAI(prompt);

        // Save to database
        const newStory = new Story({
            title,
            season,
            episode,
            characters,
            theme,
            storyTypes,
            supernatural,
            wordCount,
            content: story.content,
            metadata: story.metadata,
            userEmail: email,
            tokens: story.tokens
        });

        await newStory.save();

        // Return story
        res.json({
            success: true,
            story: {
                title,
                season,
                episode,
                content: story.content,
                metadata: story.metadata
            }
        });

    } catch (error) {
        console.error('Error generating story:', error);
        res.status(500).json({ error: 'Failed to generate story' });
    }
});

// Generate with OpenAI
async function generateWithOpenAI(prompt) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert storyteller specializing in historical fiction set in Papua New Guinea. 
                    Create emotionally engaging, authentic stories based on the 1994 Rabaul eruption. 
                    All characters are fictional but grounded in real historical context. 
                    Include subtle supernatural elements that feel culturally authentic.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 3000,
            temperature: 0.8
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            content: response.data.choices[0].message.content,
            tokens: response.data.usage.total_tokens,
            metadata: {
                model: 'gpt-4',
                provider: 'OpenAI'
            }
        };

    } catch (error) {
        console.error('OpenAI Error:', error.response?.data || error.message);
        throw error;
    }
}

// Build Story Prompt
function buildStoryPrompt({
    title,
    season,
    episode,
    characters,
    theme,
    storyTypes,
    supernatural,
    wordCount,
    details
}) {
    return `
Generate a story for the "Ashes & Spirits" series with these parameters:

**Title:** ${title}
**Season ${season}, Episode ${episode}**
**Characters:** ${characters}
**Theme:** ${theme}
**Story Types:** ${storyTypes.join(', ')}
**Supernatural Elements:** ${supernatural}
**Word Count:** ${wordCount}

**Context:**
- Setting: Rabaul, Papua New Guinea, during/after the September 19, 1994 eruption
- Genre: Historical Fiction with Supernatural Elements
- All characters are fictional but grounded in the real event
- Incorporate the supernatural element strength as specified

${details ? `**Plot Points:** ${details}` : ''}

Write a compelling, emotionally resonant story that:
1. Stands alone as a complete narrative
2. Fits the seasonal theme and episode arc
3. Includes authentic cultural and spiritual elements
4. Develops character relationships meaningfully
5. Has natural dialogue and internal reflection
6. Creates emotional impact through authentic human experiences during crisis

Generate the story now:
    `;
}

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`LokalGen Backend running on port ${PORT}`);
});
```

**File: `package.json` scripts**

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

---

### Option 2: Python FastAPI Backend

**File: `main.py`**

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import httpx
import json
from datetime import datetime
from pymongo import MongoClient

load_dotenv()

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Connection
client = MongoClient(os.getenv("MONGODB_URI"))
db = client['lokalgen']
stories_collection = db['stories']

# Request Model
class StoryRequest(BaseModel):
    title: str
    season: int
    episode: int
    characters: str
    theme: str
    story_types: list
    supernatural: str
    word_count: str
    details: str = None
    email: str = None

# Generate Story Endpoint
@app.post("/api/generate-story")
async def generate_story(request: StoryRequest):
    try:
        # Build prompt
        prompt = build_story_prompt(request.dict())
        
        # Call OpenAI API
        story_data = await generate_with_openai(prompt)
        
        # Save to database
        story_document = {
            "title": request.title,
            "season": request.season,
            "episode": request.episode,
            "characters": request.characters,
            "theme": request.theme,
            "story_types": request.story_types,
            "supernatural": request.supernatural,
            "word_count": request.word_count,
            "content": story_data["content"],
            "metadata": story_data["metadata"],
            "user_email": request.email,
            "tokens": story_data["tokens"],
            "created_at": datetime.now()
        }
        
        result = stories_collection.insert_one(story_document)
        
        return {
            "success": True,
            "story": {
                "title": request.title,
                "season": request.season,
                "episode": request.episode,
                "content": story_data["content"],
                "metadata": story_data["metadata"]
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Generate with OpenAI
async def generate_with_openai(prompt: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4",
                "messages": [
                    {
                        "role": "system",
                        "content": """You are an expert storyteller specializing in historical fiction set in Papua New Guinea. 
                        Create emotionally engaging, authentic stories based on the 1994 Rabaul eruption. 
                        All characters are fictional but grounded in real historical context."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": 3000,
                "temperature": 0.8
            }
        )
        
        data = response.json()
        return {
            "content": data["choices"][0]["message"]["content"],
            "tokens": data["usage"]["total_tokens"],
            "metadata": {
                "model": "gpt-4",
                "provider": "OpenAI"
            }
        }

# Build Story Prompt
def build_story_prompt(params: dict) -> str:
    return f"""
Generate a story for the "Ashes & Spirits" series with these parameters:

**Title:** {params['title']}
**Season {params['season']}, Episode {params['episode']}**
**Characters:** {params['characters']}
**Theme:** {params['theme']}
**Story Types:** {', '.join(params['story_types'])}
**Supernatural Elements:** {params['supernatural']}
**Word Count:** {params['word_count']}

**Context:**
- Setting: Rabaul, Papua New Guinea, September 1994 eruption
- Genre: Historical Fiction with Supernatural Elements
- All characters are fictional but grounded in real events

{f"**Plot Points:** {params['details']}" if params.get('details') else ''}

Write a compelling story that stands alone while fitting the series arc.
"""

# Health Check
@app.get("/health")
async def health_check():
    return {"status": "OK", "timestamp": datetime.now()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
```

---

## 🤖 AI Integration Options

### Option 1: OpenAI GPT-4

**Advantages:**
- ✅ Most powerful model
- ✅ Best for creative writing
- ✅ Well-documented
- ✅ Reliable performance

**Disadvantages:**
- ❌ Most expensive (~$0.03 per 1K tokens)
- ❌ Requires API key

**Setup:**
1. Go to https://platform.openai.com/signup
2. Create account and generate API key
3. Add to `.env`: `OPENAI_API_KEY=sk-xxx...`
4. Add credits to account (starts at $5)

**Cost Estimate:** ~$0.10-0.30 per story

---

### Option 2: Anthropic Claude

**Advantages:**
- ✅ Excellent for nuanced writing
- ✅ Strong cultural sensitivity
- ✅ Longer context windows
- ✅ Competitive pricing

**Disadvantages:**
- ❌ Slightly slower responses
- ❌ Newer API

**Setup:**
1. Go to https://console.anthropic.com
2. Create account and API key
3. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-xxx...`

**Implementation:**
```python
async def generate_with_claude(prompt: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": os.getenv("ANTHROPIC_API_KEY"),
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": "claude-3-sonnet-20240229",
                "max_tokens": 3000,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            }
        )
        
        data = response.json()
        return {
            "content": data["content"][0]["text"],
            "metadata": {"model": "claude-3-sonnet", "provider": "Anthropic"}
        }
```

**Cost Estimate:** ~$0.05-0.15 per story

---

### Option 3: HuggingFace (Free)

**Advantages:**
- ✅ Completely free
- ✅ Open-source models
- ✅ No API costs
- ✅ Can self-host

**Disadvantages:**
- ❌ Lower quality than commercial models
- ❌ Slower responses
- ❌ Limited customization

**Setup:**
```bash
pip install transformers torch
```

**Implementation:**
```python
from transformers import pipeline

def generate_with_huggingface(prompt: str):
    generator = pipeline(
        "text-generation",
        model="meta-llama/Llama-2-7b-chat-hf",
        device=0  # GPU device
    )
    
    result = generator(prompt, max_length=3000)
    return {"content": result[0]["generated_text"]}
```

**Cost Estimate:** $0 (but slower, lower quality)

---

## 💾 Database Setup

### MongoDB Atlas (Recommended - Free tier available)

1. **Create Account:**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up with Google/GitHub
   - Create organization

2. **Create Cluster:**
   - Click "Build a Cluster"
   - Select "M0 Sandbox" (free)
   - Choose region
   - Create cluster

3. **Setup Credentials:**
   - Go to "Database Access"
   - Create username/password
   - Go to "Network Access"
   - Add IP (or 0.0.0.0 for development)
   - Get connection string

4. **Add to `.env`:**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lokalgen?retryWrites=true&w=majority
   ```

### PostgreSQL (Alternative)

1. **Local Setup:**
   ```bash
   # On Mac
   brew install postgresql
   brew services start postgresql
   
   # On Linux
   sudo apt-get install postgresql
   sudo service postgresql start
   ```

2. **Create Database:**
   ```bash
   createdb lokalgen
   psql lokalgen
   ```

3. **Schema:**
   ```sql
   CREATE TABLE stories (
       id SERIAL PRIMARY KEY,
       title VARCHAR(255),
       season INTEGER,
       episode INTEGER,
       characters TEXT,
       theme VARCHAR(100),
       content TEXT,
       user_email VARCHAR(255),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       email VARCHAR(255) UNIQUE,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

---

## 📡 API Endpoints

### Generate Story

**POST** `/api/generate-story`

Request:
```json
{
  "title": "The Radio Operator",
  "season": 1,
  "episode": 1,
  "characters": "Marcus, James, Elena",
  "theme": "hope",
  "story_types": ["survival", "spiritual"],
  "supernatural": "moderate",
  "word_count": "long",
  "details": "Marcus receives mysterious radio transmissions",
  "email": "user@example.com"
}
```

Response:
```json
{
  "success": true,
  "story": {
    "title": "The Radio Operator",
    "season": 1,
    "episode": 1,
    "content": "The crackling static filled Marcus Reid's ears...",
    "metadata": {
      "model": "gpt-4",
      "provider": "OpenAI",
      "tokens": 2845
    }
  }
}
```

### Get Story

**GET** `/api/stories/:id`

### List Stories

**GET** `/api/stories?season=1&limit=10`

### Health Check

**GET** `/health`

---

## 🚀 Deployment

### Deploy to Heroku

1. **Install Heroku CLI:**
   ```bash
   brew tap heroku/brew && brew install heroku
   heroku login
   ```

2. **Create Heroku App:**
   ```bash
   heroku create lokalgen-backend
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set OPENAI_API_KEY=sk-xxx...
   heroku config:set MONGODB_URI=mongodb+srv://...
   heroku config:set FRONTEND_URL=https://NCInnovate.github.io/LokalGen-V2
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   heroku logs --tail
   ```

### Deploy to Railway

1. Go to https://railway.app
2. Connect GitHub repo
3. Set environment variables in dashboard
4. Deploy automatically on push

### Deploy to Render

1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub
4. Set environment variables
5. Deploy

---

## 🔒 Security

### Environment Variables
- ✅ Never commit `.env` file
- ✅ Use `.gitignore`
- ✅ Store secrets in deployment platform

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per minute
    message: 'Too many requests, please try again later'
});

app.use('/api/generate-story', limiter);
```

### Input Validation

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/generate-story',
    body('title').trim().isLength({ min: 3, max: 100 }),
    body('season').isInt({ min: 1, max: 10 }),
    body('episode').isInt({ min: 1, max: 20 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // Process...
    }
);
```

### CORS Configuration

```javascript
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
}));
```

---

## 🐛 Troubleshooting

### "API Key Error"
- ✅ Check `.env` file has correct key
- ✅ Verify key is active in provider dashboard
- ✅ Check key has sufficient credits

### "Connection Timeout"
- ✅ Check internet connection
- ✅ Verify API provider is up (check status page)
- ✅ Increase timeout in axios/requests config

### "Database Error"
- ✅ Verify MongoDB/PostgreSQL is running
- ✅ Check connection string in `.env`
- ✅ Verify IP whitelist in MongoDB Atlas

### "CORS Error"
- ✅ Check FRONTEND_URL matches exact origin
- ✅ Verify CORS middleware is enabled
- ✅ Check browser console for exact error

### "Story Generation Too Slow"
- ✅ Switch to faster model (gpt-3.5-turbo instead of gpt-4)
- ✅ Reduce max_tokens
- ✅ Use async processing (queue system)

---

## 📊 Monitoring & Logging

### Add Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Usage
logger.info('Story generated successfully');
logger.error('API error:', error);
```

### Performance Monitoring

Track:
- Average generation time
- API costs
- Error rates
- User engagement

---

## 📈 Scaling

For production use:

1. **Queue System** (Bull, Celery)
   - Handle multiple concurrent requests
   - Retry failed generations
   - Prevent timeout issues

2. **Caching** (Redis)
   - Cache frequently accessed stories
   - Reduce API calls
   - Improve response time

3. **Load Balancing**
   - Multiple backend instances
   - Distribute traffic
   - Improve reliability

4. **CDN**
   - Cache static assets
   - Reduce latency
   - Improve performance

---

## 🎯 Next Steps

1. ✅ Choose technology stack (Node vs Python)
2. ✅ Choose AI provider (OpenAI vs Claude vs HuggingFace)
3. ✅ Setup development environment
4. ✅ Implement backend
5. ✅ Setup database
6. ✅ Test locally
7. ✅ Deploy to production
8. ✅ Monitor and optimize

---

## 📚 Additional Resources

- [OpenAI Documentation](https://platform.openai.com/docs)
- [Anthropic Claude Docs](https://docs.anthropic.com)
- [Express.js Guide](https://expressjs.com)
- [FastAPI Tutorial](https://fastapi.tiangolo.com)
- [MongoDB Docs](https://docs.mongodb.com)
- [Heroku Deployment](https://devcenter.heroku.com)

---

*Last Updated: June 12, 2026*  
*For support: Check GitHub Issues or documentation*