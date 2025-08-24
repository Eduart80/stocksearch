import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'A96Z9ST5YY6GBVUG';
const TRADIER_API_KEY = process.env.TRADIER_API_KEY || 'YOUR_TRADIER_API_KEY'; // Replace with Tradier Sandbox API key
const TRADE_STATION_CLIENT_ID = process.env.TRADE_STATION_CLIENT_ID || 'YOUR_TRADE_STATION_CLIENT_ID'; // Replace with TradeStation API key
const TRADE_STATION_CLIENT_SECRET = process.env.TRADE_STATION_CLIENT_SECRET || 'YOUR_TRADE_STATION_CLIENT_SECRET'; // Replace with TradeStation client secret
const TRADE_STATION_REDIRECT_URI = 'http://localhost:3000/api/tradestation/callback';
let TRADE_STATION_ACCESS_TOKEN = ''; // Will be set after authentication

// Enable CORS
app.use(cors());

// Serve static files from the public folder
app.use(express.static(join(__dirname, 'public')));

// TradeStation: Start OAuth2 Flow
app.get('/api/tradestation/auth', (req, res) => {
  const authUrl = `https://api.tradestation.com/v3/authorize?response_type=code&client_id=${TRADE_STATION_CLIENT_ID}&redirect_uri=${encodeURIComponent(TRADE_STATION_REDIRECT_URI)}&scope=openid+profile+MarketData+ReadAccount+Trade`;
  res.redirect(authUrl);
});

// TradeStation: Callback to Exchange Code for Token
app.get('/api/tradestation/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No authorization code provided.');
  }

  try {
    const response = await fetch('https://api.tradestation.com/v3/security/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: TRADE_STATION_CLIENT_ID,
        client_secret: TRADE_STATION_CLIENT_SECRET,
        redirect_uri: TRADE_STATION_REDIRECT_URI,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    TRADE_STATION_ACCESS_TOKEN = data.access_token;
    const refresh_token = data.refresh_token;

    res.send(`
      <h1>Authentication Successful</h1>
      <p>Access Token: ${TRADE_STATION_ACCESS_TOKEN}</p>
      <p>Refresh Token: ${refresh_token}</p>
      <p>Copy the Access Token and add it to TRADE_STATION_ACCESS_TOKEN in server.js. Save the Refresh Token securely for future use.</p>
      <p><a href="/">Return to App</a></p>
    `);
  } catch (error) {
    res.status(500).send(`Error exchanging code for token: ${error.message}`);
  }
});

// TradeStation: Refresh Token
app.get('/api/tradestation/refresh', async (req, res) => {
  const refresh_token = req.query.refresh_token; // Provide refresh token via query
  try {
    const response = await fetch('https://api.tradestation.com/v3/security/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: TRADE_STATION_CLIENT_ID,
        client_secret: TRADE_STATION_CLIENT_SECRET,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    TRADE_STATION_ACCESS_TOKEN = data.access_token;
    res.json({ access_token: TRADE_STATION_ACCESS_TOKEN });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TradeStation SIM: Quote
app.get('/api/tradestation/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const response = await fetch(`https://sim-api.tradestation.com/v3/marketdata/quote/${symbol}`, {
      headers: {
        Authorization: `Bearer ${TRADE_STATION_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TradeStation SIM: Historical Data
app.get('/api/tradestation/historical/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { interval, unit } = req.query;
  try {
    const url = `https://sim-api.tradestation.com/v3/marketdata/barcharts/${symbol}?interval=${interval || 1}&unit=${unit || 'Day'}&barsback=35`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TRADE_STATION_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TradeStation SIM: Options and Expirations
app.get('/api/tradestation/options/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { expiration } = req.query;
  try {
    const url = expiration
      ? `https://sim-api.tradestation.com/v3/marketdata/optionschain/${symbol}?expiration=${expiration}`
      : `https://sim-api.tradestation.com/v3/marketdata/optionsexpirations/${symbol}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TRADE_STATION_ACCESS_TOKEN}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alpha Vantage: Quote
app.get('/api/alpha-vantage/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`);
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
        Accept: 'application/json',
      },
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
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CoinGecko: Search and Price
app.get('/api/coingecko/search/:query', async (req, res) => {
  const { query } = req.params;
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${query}`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coingecko/price/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coingecko/market/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=35&interval=daily`);
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