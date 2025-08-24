import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import { calculateEMA, calculateMACD, calculateRSI, getCombinedSignal, getSignalClass, lookupTickerIndex } from './utils.js';

describe('index.html Tests', () => {
    let document, window, fetchStub;

    beforeEach(() => {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <input id="ticker" value="AAPL" />
                    <select id="assetType"><option value="stock">Stock</option></select>
                    <div id="lookupResults"></div>
                    <div id="output"></div>
                    <canvas id="priceChart"></canvas>
                </body>
            </html>
        `);
        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;
        global.fetch = sinon.stub();
        fetchStub = global.fetch;
    });

    afterEach(() => {
        sinon.restore();
        delete global.document;
        delete global.window;
        delete global.fetch;
    });

    describe('calculateEMA', () => {
        it('should calculate EMA correctly for period 3', () => {
            const prices = [100, 102, 101, 103];
            const period = 3;
            const expected = [100, 101, 101, 102];
            const result = calculateEMA(prices, period);
            result.forEach((val, i) => expect(val).to.be.closeTo(expected[i], 0.1));
        });

        it('should handle single price', () => {
            const prices = [100];
            const result = calculateEMA(prices, 3);
            expect(result).to.deep.equal([100]);
        });
    });

    describe('calculateMACD', () => {
        it('should return nulls for insufficient data', () => {
            const prices = Array(10).fill().map((_, i) => [Date.now(), 100 + i]);
            const result = calculateMACD(prices);
            expect(result).to.deep.equal({ macd: null, signal: null, prevMacd: null, prevSignal: null });
        });

        it('should calculate MACD correctly', () => {
            const prices = Array(35).fill().map((_, i) => [Date.now(), 100 + i * 0.1]);
            const result = calculateMACD(prices);
            expect(result.macd).to.be.a('number');
            expect(result.signal).to.be.a('number');
            expect(result.prevMacd).to.be.a('number');
            expect(result.prevSignal).to.be.a('number');
        });
    });

    describe('calculateRSI', () => {
        it('should return null for insufficient data', () => {
            const prices = Array(10).fill().map((_, i) => [Date.now(), 100 + i]);
            const result = calculateRSI(prices);
            expect(result).to.be.null;
        });

        it('should calculate RSI correctly for all gains', () => {
            const prices = Array(15).fill().map((_, i) => [Date.now(), 100 + i]);
            const result = calculateRSI(prices);
            expect(result).to.equal(100);
        });

        it('should calculate RSI correctly for mixed changes', () => {
            const prices = [[Date.now(), 100], [Date.now(), 102], [Date.now(), 101], [Date.now(), 103], [Date.now(), 100], [Date.now(), 98], [Date.now(), 99], [Date.now(), 100], [Date.now(), 102], [Date.now(), 104], [Date.now(), 103], [Date.now(), 102], [Date.now(), 101], [Date.now(), 100], [Date.now(), 102]];
            const result = calculateRSI(prices);
            expect(result).to.be.closeTo(50, 10);
        });
    });

    describe('getCombinedSignal', () => {
        it('should return Insufficient data for null inputs', () => {
            const result = getCombinedSignal(null, { macd: null, signal: null, prevMacd: null, prevSignal: null });
            expect(result).to.equal('Insufficient data');
        });

        it('should return Buy for oversold RSI and bullish MACD crossover', () => {
            const result = getCombinedSignal(25, { macd: 0.5, signal: 0.4, prevMacd: 0.3, prevSignal: 0.5 });
            expect(result).to.equal('Buy (Oversold + Bullish Crossover)');
        });

        it('should return Sell for overbought RSI and bearish MACD crossover', () => {
            const result = getCombinedSignal(75, { macd: 0.4, signal: 0.5, prevMacd: 0.6, prevSignal: 0.4 });
            expect(result).to.equal('Sell (Overbought + Bearish Crossover)');
        });

        it('should return Hold for neutral conditions', () => {
            const result = getCombinedSignal(50, { macd: 0.5, signal: 0.5, prevMacd: 0.5, prevSignal: 0.5 });
            expect(result).to.equal('Hold (Neutral)');
        });
    });

    describe('getSignalClass', () => {
        it('should return signal-buy for Buy signal', () => {
            const result = getSignalClass('Buy (Oversold + Bullish Crossover)');
            expect(result).to.equal('signal-buy');
        });

        it('should return signal-sell for Sell signal', () => {
            const result = getSignalClass('Sell (Overbought + Bearish Crossover)');
            expect(result).to.equal('signal-sell');
        });

        it('should return signal-hold for Hold signal', () => {
            const result = getSignalClass('Hold (Neutral)');
            expect(result).to.equal('signal-hold');
        });
    });

    describe('lookupTickerIndex', () => {
        it('should handle empty ticker', async () => {
            document.getElementById('ticker').value = '';
            document.getElementById('assetType').value = 'stock';
            await lookupTickerIndex('', 'stock', fetchStub, document);
            expect(document.getElementById('lookupResults').innerHTML).to.include('Please enter a ticker to search');
        });

        it('should mock TradeStation quote response for AAPL', async () => {
            document.getElementById('ticker').value = 'AAPL';
            document.getElementById('assetType').value = 'stock';
            fetchStub.resolves({
                ok: true,
                json: async () => ({
                    Quotes: [{ Symbol: 'AAPL', Description: 'Apple Inc.' }]
                })
            });
            await lookupTickerIndex('AAPL', 'stock', fetchStub, document);
            expect(document.getElementById('lookupResults').innerHTML).to.include('AAPL - Apple Inc. (Stock)');
        });

        it('should mock CoinGecko response for XSP', async () => {
            document.getElementById('ticker').value = 'XSP';
            document.getElementById('assetType').value = 'crypto';
            fetchStub.resolves({
                ok: true,
                json: async () => ({
                    coins: [{ symbol: 'XSP', name: 'XSwap Protocol', id: 'xswap' }]
                })
            });
            await lookupTickerIndex('XSP', 'crypto', fetchStub, document);
            expect(document.getElementById('lookupResults').innerHTML).to.include('XSP - XSwap Protocol (Crypto, Coin ID: xswap)');
        });
    });
});