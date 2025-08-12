require("dotenv").config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors()); // Enable CORS for all routes

// app.get("/api/key", (req, res) => {
//   res.json({ key: process.env.keypass });
// });

app.get('/api/options/:ticker', async (req, res) => {
    const ticker = req.params.ticker;
    const date = req.query.date || '';
    const url = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}${date ? '?date=' + date : ''}`;
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124' }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

app.get('/api/quote/:ticker', async (req, res) => {
    const ticker = req.params.ticker;
    try {
        const response = await axios.get(`https://query1.finance.yahoo.com/v7/finance/quote/?symbols=${ticker}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124' }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));