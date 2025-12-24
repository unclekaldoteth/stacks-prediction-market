// Price service using CoinGecko API (free, no API key required)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface PriceData {
    btc: number;
    stx: number;
    btcChange24h: number;
    stxChange24h: number;
    lastUpdated: Date;
}

// Default fallback prices when API fails
const FALLBACK_PRICES: PriceData = {
    btc: 95000,
    stx: 0.24,
    btcChange24h: 0,
    stxChange24h: 0,
    lastUpdated: new Date(),
};

let cachedPrices: PriceData | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000; // 60 seconds cache (increased to reduce rate limiting)

export async function getPrices(): Promise<PriceData> {
    const now = Date.now();

    // Return cached data if still valid
    if (cachedPrices && now - lastFetchTime < CACHE_DURATION) {
        return cachedPrices;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=bitcoin,blockstack&vs_currencies=usd&include_24hr_change=true`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                signal: controller.signal,
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            // Don't throw, just log and return fallback
            console.warn(`CoinGecko API returned ${response.status}, using fallback prices`);
            return cachedPrices || FALLBACK_PRICES;
        }

        const data = await response.json();

        cachedPrices = {
            btc: data.bitcoin?.usd || FALLBACK_PRICES.btc,
            stx: data.blockstack?.usd || FALLBACK_PRICES.stx,
            btcChange24h: data.bitcoin?.usd_24h_change || 0,
            stxChange24h: data.blockstack?.usd_24h_change || 0,
            lastUpdated: new Date(),
        };
        lastFetchTime = now;

        return cachedPrices;
    } catch (error) {
        // Silently handle errors and return fallback
        console.warn('Price fetch failed, using fallback:', error instanceof Error ? error.message : 'Unknown error');
        return cachedPrices || FALLBACK_PRICES;
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
