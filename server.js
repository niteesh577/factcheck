const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public')); // Serve frontend files from 'public' folder

// Route for serving the main HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/main.html');
});

// API to fetch fake news analysis
app.post('/api/fact-check', async (req, res) => {
  const { query } = req.body;

  try {
    // Step 1: Fetch related news articles using News API
    const newsResponse = await axios.get(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${process.env.NEWS_API_KEY}`
    );
    const articles = newsResponse.data.articles.slice(0, 3); // Limit to 3 articles

    // Prepare context for LLM
    const context = articles
      .map((article) => `${article.title}: ${article.description}`)
      .join('\n');

    // Step 2: Send context to GROQ API for fact-checking
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-8b-8192', // Adjust model based on availability
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that fact-checks news articles.'
          },
          {
            role: 'user',
            content: `Based on the following articles, fact-check the statement: "${query}". Here are the articles:\n${context}`
          }
        ],
        max_tokens: 300
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = groqResponse.data.choices[0].message.content;

    res.json({ result, articles });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to process your request.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});