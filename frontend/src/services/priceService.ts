// Price service using CoinGecko API (free, no API key required)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface PriceData {
    btc: number;
    stx: number;
    btcChange24h: number;
    stxChange24h: number;
    lastUpdated: Date;
}

let cachedPrices: PriceData | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

export async function getPrices(): Promise<PriceData> {
    const now = Date.now();

    // Return cached data if still valid
    if (cachedPrices && now - lastFetchTime < CACHE_DURATION) {
        return cachedPrices;
    }

    try {
        const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=bitcoin,blockstack&vs_currencies=usd&include_24hr_change=true`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 30 } // Next.js cache
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();

        cachedPrices = {
            btc: data.bitcoin?.usd || 0,
            stx: data.blockstack?.usd || 0,
            btcChange24h: data.bitcoin?.usd_24h_change || 0,
            stxChange24h: data.blockstack?.usd_24h_change || 0,
            lastUpdated: new Date(),
        };
        lastFetchTime = now;

        return cachedPrices;
    } catch (error) {
        console.error('Failed to fetch prices:', error);

        // Return cached data or defaults on error
        if (cachedPrices) {
            return cachedPrices;
        }

        return {
            btc: 97500, // Fallback price
            stx: 0.25,
            btcChange24h: 0,
            stxChange24h: 0,
            lastUpdated: new Date(),
        };
    }
}

// Get BTC price in USD
export async function getBTCPrice(): Promise<number> {
    const prices = await getPrices();
    return prices.btc;
}

// Get STX price in USD
export async function getSTXPrice(): Promise<number> {
    const prices = await getPrices();
    return prices.stx;
}
