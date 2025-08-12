module.exports = async (req, res) => {
  const { functionName, symbol, outputsize = 'compact' } = req.query;
  // Store API key in environment variable (set in Vercel dashboard)
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'XQD97FFG75HFV1TA'; // Fallback for testing
  const url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&outputsize=${outputsize}&apikey=${API_KEY}`;
  
  try {
    const fetch = require('node-fetch');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};