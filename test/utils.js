export function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    const emaArray = [ema];
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
        emaArray.push(ema);
    }
    return emaArray;
}

export function calculateMACD(prices) {
    if (prices.length < 26 + 9) return { macd: null, signal: null, prevMacd: null, prevSignal: null };
    const closingPrices = prices.map(p => p[1]);
    const ema12 = calculateEMA(closingPrices, 12);
    const ema26 = calculateEMA(closingPrices, 26);
    const macdLine = ema12.slice(-ema26.length).map((ema12, i) => ema12 - ema26[i]);
    const signalLine = calculateEMA(macdLine, 9);
    return {
        macd: macdLine[macdLine.length - 1],
        signal: signalLine[signalLine.length - 1],
        prevMacd: macdLine[macdLine.length - 2],
        prevSignal: signalLine[signalLine.length - 2]
    };
}

export function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    const closingPrices = prices.slice(-(period + 1)).map(p => p[1]);
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < closingPrices.length; i++) {
        const change = closingPrices[i] - closingPrices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

export function getCombinedSignal(rsi, macdData) {
    if (rsi === null || macdData.macd === null) return 'Insufficient data';
    const rsiSignal = rsi < 30 ? 'Buy' : rsi > 70 ? 'Sell' : 'Hold';
    const macdSignal = macdData.macd > macdData.signal && macdData.prevMacd <= macdData.prevSignal ? 'Buy' :
                      macdData.macd < macdData.signal && macdData.prevMacd >= macdData.prevSignal ? 'Sell' : 'Hold';
    if (rsiSignal === 'Buy' && macdSignal === 'Buy') return 'Buy (Oversold + Bullish Crossover)';
    if (rsiSignal === 'Sell' && macdSignal === 'Sell') return 'Sell (Overbought + Bearish Crossover)';
    return 'Hold (Neutral)';
}

export function getSignalClass(signal) {
    if (signal.includes('Buy')) return 'signal-buy';
    if (signal.includes('Sell')) return 'signal-sell';
    return 'signal-hold';
}

export function normCdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) prob = 1 - prob;
    return prob;
}

export function blackScholesDelta(S, K, T, r, sigma, type = 'call') {
    if (T <= 0 || sigma <= 0) return 0.5;
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    if (type === 'call') {
        return normCdf(d1);
    } else {
        return normCdf(d1) - 1;
    }
}

export async function lookupTickerIndex(tickerInput, assetTypeInput, fetch, document) {
    const ticker = tickerInput.trim().toLowerCase().replace(/[^a-z0-9-^=]/g, '');
    const assetType = assetTypeInput;
    const lookupResults = document.getElementById('lookupResults');
    if (!ticker) {
        lookupResults.innerHTML = '<p>Please enter a ticker to search.</p>';
        return;
    }
    try {
        let results = [];
        if (assetType === 'crypto') {
            const response = await fetch(`http://localhost:3000/api/coingecko/search/${ticker}`);
            const data = await response.json();
            if (data.coins && data.coins.length > 0) {
                results = data.coins.slice(0, 5).map(coin => ({
                    ticker: coin.symbol.toUpperCase(),
                    name: coin.name,
                    type: 'Crypto',
                    id: coin.id
                }));
            }
        } else {
            const response = await fetch(`http://localhost:3000/api/tradestation/quote/${ticker}`);
            const data = await response.json();
            if (data.Quotes && data.Quotes.length > 0) {
                results = data.Quotes.slice(0, 5).map(quote => ({
                    ticker: quote.Symbol,
                    name: quote.Description,
                    type: assetType === 'stock' ? 'Stock' : (assetType === 'futures' ? 'Futures' : 'Index Options')
                }));
            }
            if (assetType === 'options' && (ticker === 'spx' || ticker === '^spx' || ticker === 'xsp' || ticker === '^xsp')) {
                results.push({
                    ticker: ticker === 'spx' || ticker === '^spx' ? '^SPX' : '^XSP',
                    name: ticker === 'spx' || ticker === '^spx' ? 'S&P 500 Index' : 'Mini-SPX Index',
                    type: 'Index Options'
                });
            }
        }
        if (results.length === 0) {
            lookupResults.innerHTML = `<p>No results found for "${ticker}" in ${assetType}. Try a different ticker or asset type (e.g., AAPL, ES=F, ^SPX).</p>`;
            return;
        }
        lookupResults.innerHTML = `
            <p><strong>Search Results for "${ticker}":</strong></p>
            <ul>
                ${results.map(r => `
                    <li class="ticker-option" onclick="selectTicker('${r.ticker}', '${r.type.toLowerCase()}${r.id ? ',' + r.id : ''}')">
                        ${r.ticker} - ${r.name} (${r.type}${r.id ? ', Coin ID: ' + r.id : ''})
                    </li>
                `).join('')}
            </ul>
        `;
    } catch (error) {
        lookupResults.innerHTML = `<p>Error searching ticker: ${error.message}. Ensure server is running (http://localhost:3000) and TradeStation access token is valid.</p>`;
    }
}

export async function lookupTickerAdvancedOptions(tickerInput, fetch, document) {
    const ticker = tickerInput.trim().toUpperCase().replace(/[^A-Z0-9^]/g, '');
    const lookupResults = document.getElementById('lookupResults');
    if (!ticker) {
        lookupResults.innerHTML = '<p>Please enter a ticker to search.</p>';
        return;
    }
    try {
        const quoteResponse = await fetch(`http://localhost:3000/api/tradestation/quote/${ticker}`);
        const quoteData = await quoteResponse.json();
        let results = [];
        if (quoteData.Quotes && quoteData.Quotes.length > 0) {
            const optionsResponse = await fetch(`http://localhost:3000/api/tradestation/options/${ticker}`);
            const optionsData = await optionsResponse.json();
            if (optionsData.Expirations && optionsData.Expirations.length > 0) {
                results.push({
                    ticker: ticker,
                    name: quoteData.Quotes[0].Description || `Unknown (${ticker})`,
                    type: 'Options'
                });
            }
        }
        if (results.length === 0) {
            lookupResults.innerHTML = `<p>No options chain found for "${ticker}". Try ^SPX, ^XSP, AAPL, or TSLA.</p>`;
            return;
        }
        lookupResults.innerHTML = `
            <p><strong>Search Results for "${ticker}":</strong></p>
            <ul>
                ${results.map(r => `
                    <li class="ticker-option" onclick="selectTicker('${r.ticker}')">
                        ${r.ticker} - ${r.name} (${r.type})
                    </li>
                `).join('')}
            </ul>
        `;
    } catch (error) {
        lookupResults.innerHTML = `<p>Error searching ticker: ${error.message}. Ensure server is running (http://localhost:3000) and TradeStation access token is valid.</p>`;
    }
}