import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'XQD97FFG75HFV1TA';
const TRADIER_API_KEY = process.env.TRADIER_API_KEY || 'YOUR_TRADIER_API_KEY'; // Replace with Tradier Sandbox API key

// Enable CORS
app.use(cors());

// Serve static files from the public folder
app.use(express.static(join(__dirname)));

// Alpha Vantage: Quote
app.get('/api/alpha-vantage/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alpha Vantage: Options (Premium, may not work with free key)
app.get('/api/alpha-vantage/options/:symbol', async (req, res) => {
  const { symbol, expiration } = req.params;
  try {
    const url = expiration
      ? `https://www.alphavantage.co/query?function=OPTIONS_DATA&symbol=${symbol}&expiration=${expiration}&apikey=${ALPHA_VANTAGE_API_KEY}`
      : `https://www.alphavantage.co/query?function=OPTIONS_DATA&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tradier: Quote
app.get('/api/tradier/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const response = await fetch(`https://sandbox.tradier.com/v1/markets/quotes?symbols=${symbol}`, {
      headers: {
        Authorization: `Bearer ${TRADIER_API_KEY}`,
        Accept: 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tradier: Options and Expirations
app.get('/api/tradier/options/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { expiration } = req.query;
  try {
    const url = expiration
      ? `https://sandbox.tradier.com/v1/markets/options/chains?symbol=${symbol}&expiration=${expiration}`
      : `https://sandbox.tradier.com/v1/markets/options/expirations?symbol=${symbol}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TRADIER_API_KEY}`,
        Accept: 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});