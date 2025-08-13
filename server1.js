import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from the public folder
app.use(express.static(join(__dirname, 'public')));

// Route for Alpha Vantage API
app.get('/api/alpha-vantage', async (req, res) => {
  const { functionName, symbol, outputsize = 'compact' } = req.query;
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'XQD97FFG75HFV1TA';
  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&outputsize=${outputsize}&apikey=${API_KEY}`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route for Yahoo Finance API
app.get('/api/yahoo-finance', async (req, res) => {
  const { endpoint, ticker, date = '' } = req.query;
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/${endpoint}/${ticker}${date ? '?date=' + date : ''}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124' }
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});