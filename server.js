import express from 'express';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public folder
app.use(express.static(join(__dirname, 'public')));

// Alpha Vantage API proxy
app.get('/api/alpha-vantage', async (req, res) => {
  const { functionName, symbol, outputsize = 'compact' } = req.query;
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'XQD97FFG75HFV1TA'; // Fallback, replace with your key
  const url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&outputsize=${outputsize}&apikey=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yahoo Finance API proxy
app.get('/api/yahoo-finance', async (req, res) => {
  const { endpoint, ticker, date = '' } = req.query;
  const url = `https://query1.finance.yahoo.com/v7/finance/${endpoint}/${ticker}${date ? '?date=' + date : ''}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124' }
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});