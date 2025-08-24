import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import { normCdf, blackScholesDelta } from './utils.js';

describe('advanced_options.html Tests', () => {
    let document, window, fetchStub;

    beforeEach(() => {
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <input id="ticker" value="^SPX" />
                    <select id="expiration"><option value="2025-09-19">2025-09-19</option></select>
                    <select id="spreadType"><option value="call">Vertical Call Credit Spread</option></select>
                    <div id="lookupResults"></div>
                    <div id="output"></div>
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

    describe('normCdf', () => {
        it('should calculate normal CDF for x = 0', () => {
            const result = normCdf(0);
            expect(result).to.be.closeTo(0.5, 0.01);
        });

        it('should calculate normal CDF for positive x', () => {
            const result = normCdf(1);
            expect(result).to.be.closeTo(0.8413, 0.01);
        });

        it('should calculate normal CDF for negative x', () => {
            const result = normCdf(-1);
            expect(result).to.be.closeTo(0.1587, 0.01);
        });
    });

    describe('blackScholesDelta', () => {
        it('should return 0.5 for expired or zero volatility', () => {
            const result = blackScholesDelta(100, 100, 0, 0.05, 0.2, 'call');
            expect(result).to.equal(0.5);
        });

        it('should calculate call delta correctly', () => {
            const result = blackScholesDelta(100, 100, 0.5, 0.05, 0.2, 'call');
            expect(result).to.be.closeTo(0.55, 0.05);
        });

        it('should calculate put delta correctly', () => {
            const result = blackScholesDelta(100, 100, 0.5, 0.05, 0.2, 'put');
            expect(result).to.be.closeTo(-0.45, 0.05);
        });
    });

    describe('lookupTicker', () => {
        it('should handle empty ticker', async () => {
            document.getElementById('ticker').value = '';
            global.lookupTicker = require('../public/advanced_options.html').lookupTicker;
            await global.lookupTicker();
            expect(document.getElementById('lookupResults').innerHTML).to.include('Please enter a ticker to search');
        });

        it('should mock TradeStation options response for ^SPX', async () => {
            document.getElementById('ticker').value = '^SPX';
            fetchStub.onCall(0).resolves({
                ok: true,
                json: () => Promise.resolve({
                    Quotes: [{ Symbol: '^SPX', Description: 'S&P 500 Index' }]
                })
            });
            fetchStub.onCall(1).resolves({
                ok: true,
                json: () => Promise.resolve({
                    Expirations: [{ ExpirationDate: '2025-09-19' }]
                })
            });
            global.lookupTicker = require('../public/advanced_options.html').lookupTicker;
            await global.lookupTicker();
            expect(document.getElementById('lookupResults').innerHTML).to.include('^SPX - S&P 500 Index (Options)');
        });
    });
});