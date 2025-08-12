module.exports = async (req, res) => {
  const { endpoint, ticker, date = '' } = req.query;
  const url = `https://query1.finance.yahoo.com/v7/finance/${endpoint}/${ticker}${date ? '?date=' + date : ''}`;
  try {
    const fetch = require('node-fetch');
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124' }
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};