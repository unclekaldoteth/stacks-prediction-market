import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3002', 'https://stacks-prediction-market.vercel.app'];

// CORS Middleware - Production ready
app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;

    // Allow specific origins in production, all in development
    if (NODE_ENV === 'development' || (origin && ALLOWED_ORIGINS.includes(origin))) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// Rate limiting - Simple in-memory implementation
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

app.use((req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let rateData = rateLimitMap.get(ip);

    if (!rateData || now > rateData.resetTime) {
        rateData = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
        rateLimitMap.set(ip, rateData);
    } else {
        rateData.count++;
    }

    if (rateData.count > RATE_LIMIT_MAX_REQUESTS) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
    }

    next();
});

// Middleware
app.use(express.json({ limit: '10mb' }));

// Types for Chainhook payloads
interface PrintEvent {
    contract_identifier: string;
    topic: string;
    value: {
        event: string;
        // prediction-market-v2 events
        'round-id'?: number;
        user?: string;
        direction?: number;
        amount?: number;
        'direction-label'?: string;
        'start-price'?: number;
        'end-price'?: number;
        'winning-direction'?: number;
        'pool-up'?: number;
        'pool-down'?: number;
        'start-block'?: number;
        'end-block'?: number;
        // prediction-pools events
        'pool-id'?: number;
        title?: string;
        description?: string;
        category?: string;
        'outcome-a'?: string;
        'outcome-b'?: string;
        creator?: string;
        expiry?: number;
        'token-type'?: number;
        outcome?: number;
        'winning-outcome'?: number;
        'total-pool'?: number;
        'payout'?: number;
    };
};

interface ChainhookPayload {
    apply: Array<{
        block_identifier: {
            index: number;
            hash: string;
        };
        transactions: Array<{
            transaction_identifier: {
                hash: string;
            };
            metadata: {
                success: boolean;
                receipt: {
                    events: Array<{
                        type: string;
                        data: PrintEvent;
                    }>;
                };
            };
        }>;
    }>;
    rollback?: Array<{
        block_identifier: {
            index: number;
            hash: string;
        };
    }>;
}

// In-memory storage (replace with database in production)
interface Bet {
    roundId: number;
    user: string;
    direction: number;
    directionLabel: string;
    amount: number;
    txHash: string;
    blockHeight: number;
    timestamp: Date;
}

interface Round {
    roundId: number;
    status: 'open' | 'closed' | 'resolved';
    startPrice?: number;
    endPrice?: number;
    poolUp: number;
    poolDown: number;
    winningDirection?: number;
    startBlock?: number;
    endBlock?: number;
    startTime?: number;
}

// Prediction Pools types
interface Pool {
    poolId: number;
    title: string;
    description: string;
    category: string;
    outcomeA: string;
    outcomeB: string;
    creator: string;
    expiry: number;
    tokenType: number;
    totalA: number;
    totalB: number;
    settled: boolean;
    winningOutcome?: number;
    depositClaimed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface PoolBet {
    poolId: number;
    user: string;
    outcome: number; // 0 = A, 1 = B
    amount: number;
    txHash: string;
    blockHeight: number;
    timestamp: Date;
}

// In-memory storage
const bets: Bet[] = [];
const rounds: Map<number, Round> = new Map();
const pools: Map<number, Pool> = new Map();
const poolBets: PoolBet[] = [];

// Chainhook webhook endpoint
app.post('/api/chainhook', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    // Verify authorization (optional but recommended)
    if (authHeader !== 'Bearer prediction-market-secret') {
        console.warn('⚠️ Unauthorized chainhook request');
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const payload: ChainhookPayload = req.body;

    console.log('\n📦 Received Chainhook Payload');
    console.log('================================');

    // Process apply blocks (new transactions)
    if (payload.apply) {
        for (const block of payload.apply) {
            console.log(`\n📦 Block #${block.block_identifier.index}`);
            console.log(`   Hash: ${block.block_identifier.hash.substring(0, 20)}...`);

            for (const tx of block.transactions) {
                if (!tx.metadata.success) continue;

                const events = tx.metadata.receipt.events || [];

                for (const event of events) {
                    if (event.type === 'print_event' && event.data?.value?.event) {
                        processEvent(
                            event.data.value,
                            tx.transaction_identifier.hash,
                            block.block_identifier.index
                        );
                    }
                }
            }
        }
    }

    // Handle rollbacks (chain reorganizations)
    if (payload.rollback && payload.rollback.length > 0) {
        console.log('\n⚠️ Rollback detected!');
        for (const block of payload.rollback) {
            console.log(`   Rolling back block #${block.block_identifier.index}`);
            // In production, you would remove/revert data from the rolled back blocks
        }
    }

    res.status(200).json({ status: 'ok' });
});

// Process individual events
function processEvent(
    eventData: PrintEvent['value'],
    txHash: string,
    blockHeight: number
) {
    const eventType = eventData.event;

    switch (eventType) {
        // prediction-market-v2 events
        case 'bet-placed':
            handleBetPlaced(eventData, txHash, blockHeight);
            break;
        case 'round-started':
            handleRoundStarted(eventData, blockHeight);
            break;
        case 'round-ended':
            handleRoundEnded(eventData);
            break;
        case 'round-resolved':
            handleRoundResolved(eventData);
            break;
        case 'winnings-claimed':
            handleWinningsClaimed(eventData);
            break;
        // prediction-pools events
        case 'pool-created':
            handlePoolCreated(eventData, blockHeight);
            break;
        case 'pool-bet-placed':
            handlePoolBetPlaced(eventData, txHash, blockHeight);
            break;
        case 'pool-settled':
            handlePoolSettled(eventData);
            break;
        case 'pool-winnings-claimed':
            handlePoolWinningsClaimed(eventData);
            break;
        case 'pool-refund':
            handlePoolRefund(eventData);
            break;
        default:
            console.log(`   Unknown event: ${eventType}`);
    }
}

function handleBetPlaced(
    data: PrintEvent['value'],
    txHash: string,
    blockHeight: number
) {
    const bet: Bet = {
        roundId: data['round-id'] || 0,
        user: data.user || '',
        direction: data.direction || 0,
        directionLabel: data['direction-label'] || (data.direction === 1 ? 'UP' : 'DOWN'),
        amount: data.amount || 0,
        txHash,
        blockHeight,
        timestamp: new Date(),
    };

    bets.push(bet);

    // Update round pool
    const round = rounds.get(bet.roundId);
    if (round) {
        if (bet.direction === 1) {
            round.poolUp += bet.amount;
        } else {
            round.poolDown += bet.amount;
        }
    }

    console.log('\n🎲 BET PLACED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Round:     #${bet.roundId}`);
    console.log(`   User:      ${bet.user}`);
    console.log(`   Direction: ${bet.directionLabel}`);
    console.log(`   Amount:    ${(bet.amount / 1000000).toFixed(2)} STX`);
    console.log(`   TX:        ${txHash.substring(0, 20)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function handleRoundStarted(data: PrintEvent['value'], blockHeight: number) {
    const roundId = data['round-id'] || 0;

    rounds.set(roundId, {
        roundId,
        status: 'open',
        startPrice: data['start-price'],
        poolUp: 0,
        poolDown: 0,
        startBlock: blockHeight,
    });

    console.log('\n🚀 ROUND STARTED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Round:       #${roundId}`);
    console.log(`   Start Price: $${(data['start-price'] || 0).toLocaleString()}`);
    console.log(`   Start Block: ${blockHeight}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function handleRoundEnded(data: PrintEvent['value']) {
    const roundId = data['round-id'] || 0;
    const round = rounds.get(roundId);

    if (round) {
        round.status = 'closed';
        round.endBlock = data['end-block'];
        round.poolUp = data['pool-up'] || round.poolUp;
        round.poolDown = data['pool-down'] || round.poolDown;
    }

    console.log('\n🔒 ROUND ENDED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Round:    #${roundId}`);
    console.log(`   Pool UP:   ${((data['pool-up'] || 0) / 1000000).toFixed(2)} STX`);
    console.log(`   Pool DOWN: ${((data['pool-down'] || 0) / 1000000).toFixed(2)} STX`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function handleRoundResolved(data: PrintEvent['value']) {
    const roundId = data['round-id'] || 0;
    const round = rounds.get(roundId);

    if (round) {
        round.status = 'resolved';
        round.endPrice = data['end-price'];
        round.winningDirection = data['winning-direction'];
    }

    const winLabel = data['winning-direction'] === 1 ? '📈 UP' : '📉 DOWN';

    console.log('\n🏆 ROUND RESOLVED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Round:       #${roundId}`);
    console.log(`   Start Price: $${(data['start-price'] || 0).toLocaleString()}`);
    console.log(`   End Price:   $${(data['end-price'] || 0).toLocaleString()}`);
    console.log(`   Winner:      ${winLabel}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function handleWinningsClaimed(data: PrintEvent['value']) {
    console.log('\n💰 WINNINGS CLAIMED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Round:  #${data['round-id']}`);
    console.log(`   User:   ${data.user}`);
    console.log(`   Amount: ${((data.amount || 0) / 1000000).toFixed(2)} STX`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ============================================
// PREDICTION POOLS EVENT HANDLERS
// ============================================

function handlePoolCreated(data: PrintEvent['value'], blockHeight: number) {
    const poolId = data['pool-id'] || 0;
    const tokenType = data['token-type'] || 0;
    const tokenSymbol = tokenType === 1 ? 'USDCx' : 'STX';

    const pool: Pool = {
        poolId,
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'general',
        outcomeA: data['outcome-a'] || 'Yes',
        outcomeB: data['outcome-b'] || 'No',
        creator: data.creator || '',
        expiry: data.expiry || 0,
        tokenType,
        totalA: 0,
        totalB: 0,
        settled: false,
        depositClaimed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    pools.set(poolId, pool);

    console.log('\n🎯 POOL CREATED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Pool ID:  #${poolId}`);
    console.log(`   Title:    ${pool.title}`);
    console.log(`   Creator:  ${pool.creator}`);
    console.log(`   Token:    ${tokenSymbol}`);
    console.log(`   Outcomes: "${pool.outcomeA}" vs "${pool.outcomeB}"`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function handlePoolBetPlaced(data: PrintEvent['value'], txHash: string, blockHeight: number) {
    const poolId = data['pool-id'] || 0;
    const outcome = data.outcome || 0;
    const amount = data.amount || 0;

    const poolBet: PoolBet = {
        poolId,
        user: data.user || '',
        outcome,
        amount,
        txHash,
        blockHeight,
        timestamp: new Date(),
    };

    poolBets.push(poolBet);

    // Update pool totals
    const pool = pools.get(poolId);
    if (pool) {
        if (outcome === 0) {
            pool.totalA += amount;
        } else {
            pool.totalB += amount;
        }
        pool.updatedAt = new Date();
    }

    const tokenSymbol = pool?.tokenType === 1 ? 'USDCx' : 'STX';
    const outcomeLabel = outcome === 0 ? pool?.outcomeA || 'A' : pool?.outcomeB || 'B';

    console.log('\n🎲 POOL BET PLACED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Pool:    #${poolId} - ${pool?.title || 'Unknown'}`);
    console.log(`   User:    ${poolBet.user}`);
    console.log(`   Outcome: ${outcomeLabel}`);
    console.log(`   Amount:  ${(amount / 1000000).toFixed(2)} ${tokenSymbol}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function handlePoolSettled(data: PrintEvent['value']) {
    const poolId = data['pool-id'] || 0;
    const winningOutcome = data['winning-outcome'];

    const pool = pools.get(poolId);
    if (pool) {
        pool.settled = true;
        pool.winningOutcome = winningOutcome;
        pool.updatedAt = new Date();
    }

    const tokenSymbol = pool?.tokenType === 1 ? 'USDCx' : 'STX';
    const winnerLabel = winningOutcome === 0 ? pool?.outcomeA || 'A' : pool?.outcomeB || 'B';

    console.log('\n🏆 POOL SETTLED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Pool:    #${poolId} - ${pool?.title || 'Unknown'}`);
    console.log(`   Winner:  ${winnerLabel}`);
    console.log(`   Total:   ${((data['total-pool'] || 0) / 1000000).toFixed(2)} ${tokenSymbol}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function handlePoolWinningsClaimed(data: PrintEvent['value']) {
    const pool = pools.get(data['pool-id'] || 0);
    const tokenSymbol = pool?.tokenType === 1 ? 'USDCx' : 'STX';

    console.log('\n💰 POOL WINNINGS CLAIMED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Pool:   #${data['pool-id']}`);
    console.log(`   User:   ${data.user}`);
    console.log(`   Payout: ${((data.payout || 0) / 1000000).toFixed(2)} ${tokenSymbol}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function handlePoolRefund(data: PrintEvent['value']) {
    const pool = pools.get(data['pool-id'] || 0);
    const tokenSymbol = pool?.tokenType === 1 ? 'USDCx' : 'STX';

    console.log('\n🔙 POOL REFUND!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Pool:   #${data['pool-id']}`);
    console.log(`   User:   ${data.user}`);
    console.log(`   Amount: ${((data.amount || 0) / 1000000).toFixed(2)} ${tokenSymbol}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ============================================
// API ENDPOINTS
// ============================================

// Rounds API endpoints
app.get('/api/rounds', (_req: Request, res: Response) => {
    res.json(Array.from(rounds.values()));
});

app.get('/api/rounds/:id', (req: Request, res: Response) => {
    const round = rounds.get(parseInt(req.params.id));
    if (round) {
        res.json(round);
    } else {
        res.status(404).json({ error: 'Round not found' });
    }
});

app.get('/api/bets', (req: Request, res: Response) => {
    const { roundId, user } = req.query;

    let filteredBets = bets;

    if (roundId) {
        filteredBets = filteredBets.filter(b => b.roundId === parseInt(roundId as string));
    }

    if (user) {
        filteredBets = filteredBets.filter(b => b.user.toLowerCase() === (user as string).toLowerCase());
    }

    // If filtering by both, return single bet or null
    if (roundId && user) {
        res.json(filteredBets.length > 0 ? filteredBets[0] : null);
    } else {
        res.json(filteredBets);
    }
});

app.get('/api/bets/:roundId', (req: Request, res: Response) => {
    const roundBets = bets.filter(b => b.roundId === parseInt(req.params.roundId));
    res.json(roundBets);
});

// ============================================
// POOLS API ENDPOINTS
// ============================================

// Get all pools
app.get('/api/pools', (_req: Request, res: Response) => {
    const poolsList = Array.from(pools.values());
    // Sort by most recent first
    poolsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json(poolsList);
});

// Get pool by ID
app.get('/api/pools/:id', (req: Request, res: Response) => {
    const pool = pools.get(parseInt(req.params.id));
    if (pool) {
        res.json(pool);
    } else {
        res.status(404).json({ error: 'Pool not found' });
    }
});

// Get bets for a pool
app.get('/api/pools/:id/bets', (req: Request, res: Response) => {
    const poolId = parseInt(req.params.id);
    const betsForPool = poolBets.filter(b => b.poolId === poolId);
    res.json(betsForPool);
});

// Get user's bets across all pools
app.get('/api/pool-bets', (req: Request, res: Response) => {
    const { poolId, user } = req.query;

    let filteredBets = poolBets;

    if (poolId) {
        filteredBets = filteredBets.filter(b => b.poolId === parseInt(poolId as string));
    }

    if (user) {
        filteredBets = filteredBets.filter(b => b.user.toLowerCase() === (user as string).toLowerCase());
    }

    res.json(filteredBets);
});

// Get pool stats
app.get('/api/pools/stats/summary', (_req: Request, res: Response) => {
    const poolsList = Array.from(pools.values());
    const activePools = poolsList.filter(p => !p.settled);
    const settledPools = poolsList.filter(p => p.settled);

    const totalVolumeSTX = poolsList
        .filter(p => p.tokenType === 0)
        .reduce((sum, p) => sum + p.totalA + p.totalB, 0);

    const totalVolumeUSDCx = poolsList
        .filter(p => p.tokenType === 1)
        .reduce((sum, p) => sum + p.totalA + p.totalB, 0);

    res.json({
        totalPools: poolsList.length,
        activePools: activePools.length,
        settledPools: settledPools.length,
        totalVolumeSTX: totalVolumeSTX / 1000000,
        totalVolumeUSDCx: totalVolumeUSDCx / 1000000,
        totalBets: poolBets.length,
    });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Price endpoint - fetches from CoinGecko
let priceCache: { btc: number; stx: number; timestamp: number } | null = null;
const PRICE_CACHE_DURATION = 30000; // 30 seconds

interface CoinGeckoResponse {
    bitcoin?: { usd?: number; usd_24h_change?: number };
    blockstack?: { usd?: number; usd_24h_change?: number };
}

app.get('/api/prices', async (_req: Request, res: Response) => {
    const now = Date.now();

    // Return cached data if still valid
    if (priceCache && now - priceCache.timestamp < PRICE_CACHE_DURATION) {
        res.json(priceCache);
        return;
    }

    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,blockstack&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await response.json() as CoinGeckoResponse;

        priceCache = {
            btc: data.bitcoin?.usd || 0,
            stx: data.blockstack?.usd || 0,
            timestamp: now,
        };

        res.json({
            ...priceCache,
            btcChange24h: data.bitcoin?.usd_24h_change || 0,
            stxChange24h: data.blockstack?.usd_24h_change || 0,
        });
    } catch (error) {
        console.error('Failed to fetch prices:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});
// Contract configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM';
const CONTRACT_NAME = process.env.CONTRACT_NAME || 'prediction-market-v2';
const NETWORK = process.env.NETWORK || 'testnet';

// Hiro API - configurable for mainnet/testnet
const HIRO_API = NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';

// Hiro API Key for higher rate limits
const HIRO_API_KEY = process.env.HIRO_API_KEY || '';

// Helper to get Hiro API headers
const getHiroHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (HIRO_API_KEY) {
        headers['x-api-key'] = HIRO_API_KEY;
    }
    return headers;
};

// Types for Hiro API responses
interface HiroReadResponse {
    okay: boolean;
    result?: string;
}

// Blockchain sync function - reads data directly from the smart contract
async function syncFromBlockchain() {
    try {
        console.log('🔄 Syncing with blockchain...');

        // Get current round ID
        const roundIdResponse = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-current-round-id`,
            {
                method: 'POST',
                headers: getHiroHeaders(),
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [],
                }),
            }
        );

        const roundIdData = await roundIdResponse.json() as HiroReadResponse;

        if (roundIdData.okay && roundIdData.result) {
            // Parse Clarity uint - format: 0x01 + 16 bytes for uint128
            const hex = roundIdData.result.slice(2); // Remove '0x'
            if (hex.startsWith('01')) {
                const currentRoundId = parseInt(hex.slice(2), 16);
                console.log(`   Current round ID: ${currentRoundId}`);

                // Fetch each round
                for (let i = 1; i <= currentRoundId; i++) {
                    await syncRound(i);
                }
            }
        }

        console.log('✅ Blockchain sync complete');
    } catch (error) {
        console.error('❌ Blockchain sync failed:', error);
    }
}

async function syncRound(roundId: number) {
    try {
        // Encode round ID as Clarity uint
        const roundIdHex = '0x01' + roundId.toString(16).padStart(32, '0');

        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-round`,
            {
                method: 'POST',
                headers: getHiroHeaders(),
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [roundIdHex],
                }),
            }
        );

        const data = await response.json() as HiroReadResponse;

        if (data.okay && data.result && data.result !== '0x09') {
            // Import Clarity parsing
            const { cvToValue, hexToCV } = await import('@stacks/transactions');

            try {
                const clarityValue = hexToCV(data.result);
                const parsed = cvToValue(clarityValue);

                if (parsed && typeof parsed === 'object') {
                    // cvToValue returns {type, value} where value contains the actual data
                    // Each field is also {type, value}
                    const roundData = (parsed as any).value || parsed;

                    // Helper to extract numeric value from Clarity uint
                    const getNum = (field: any): number => {
                        if (!field) return 0;
                        if (typeof field === 'object' && 'value' in field) {
                            return Number(field.value);
                        }
                        return Number(field);
                    };

                    // Map status number to string
                    // Contract: STATUS_OPEN=1, STATUS_CLOSED=2, STATUS_RESOLVED=3
                    const statusNum = getNum(roundData.status);
                    let status: 'open' | 'closed' | 'resolved' = 'open';
                    if (statusNum === 1) status = 'open';
                    if (statusNum === 2) status = 'closed';
                    if (statusNum === 3) status = 'resolved';

                    // Preserve existing startTime or set new one for open rounds
                    const existingRound = rounds.get(roundId);
                    const round: Round = {
                        roundId,
                        status,
                        startPrice: getNum(roundData['start-price']),
                        endPrice: getNum(roundData['end-price']),
                        poolUp: getNum(roundData['pool-up']),
                        poolDown: getNum(roundData['pool-down']),
                        winningDirection: getNum(roundData['winning-direction']),
                        startBlock: getNum(roundData['start-block']),
                        startTime: existingRound?.startTime || (status === 'open' ? Math.floor(Date.now() / 1000) : undefined),
                    };
                    rounds.set(roundId, round);
                    console.log(`   Synced round #${roundId} - Status: ${status}, Start Price: $${round.startPrice?.toLocaleString()}, Pool UP: ${round.poolUp}, Pool DOWN: ${round.poolDown}`);
                }
            } catch (parseError) {
                console.error(`   Parse error for round ${roundId}:`, parseError);
                // Create basic entry if parsing fails
                if (!rounds.has(roundId)) {
                    rounds.set(roundId, {
                        roundId,
                        status: 'open',
                        startPrice: 0,
                        poolUp: 0,
                        poolDown: 0,
                    });
                }
            }
        }
    } catch (error) {
        console.error(`   Failed to sync round ${roundId}:`, error);
    }
}

// Start periodic blockchain sync (every 30 seconds)
setInterval(syncFromBlockchain, 30000);
setInterval(syncPoolsFromBlockchain, 30000);

// Pools blockchain sync function
const CONTRACT_NAME_POOLS = 'prediction-pools';

async function syncPoolsFromBlockchain() {
    try {
        console.log('🔄 Syncing pools from blockchain...');

        // Get pool count
        const countResponse = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME_POOLS}/get-pool-count`,
            {
                method: 'POST',
                headers: getHiroHeaders(),
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [],
                }),
            }
        );

        const countData = await countResponse.json() as HiroReadResponse;

        if (countData.okay && countData.result) {
            const hex = countData.result.slice(2);
            if (hex.startsWith('01')) {
                const poolCount = parseInt(hex.slice(2), 16);
                console.log(`   Pool count: ${poolCount}`);

                // Fetch each pool
                for (let i = 0; i < poolCount; i++) {
                    await syncPool(i);
                }
            }
        }

        console.log('✅ Pools sync complete');
    } catch (error) {
        console.error('❌ Pools sync failed:', error);
    }
}

async function syncPool(poolId: number) {
    try {
        const poolIdHex = '0x01' + poolId.toString(16).padStart(32, '0');

        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME_POOLS}/get-pool`,
            {
                method: 'POST',
                headers: getHiroHeaders(),
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [poolIdHex],
                }),
            }
        );

        const data = await response.json() as HiroReadResponse;

        if (data.okay && data.result && data.result !== '0x09') {
            const { cvToValue, hexToCV } = await import('@stacks/transactions');

            try {
                const clarityValue = hexToCV(data.result);
                const parsed = cvToValue(clarityValue);

                if (parsed && typeof parsed === 'object') {
                    const poolData = (parsed as any).value || parsed;

                    const getString = (field: any): string => {
                        if (!field) return '';
                        if (typeof field === 'object' && 'value' in field) {
                            return String(field.value);
                        }
                        return String(field);
                    };

                    const getNum = (field: any): number => {
                        if (!field) return 0;
                        if (typeof field === 'object' && 'value' in field) {
                            return Number(field.value);
                        }
                        return Number(field) || 0;
                    };

                    const getBool = (field: any): boolean => {
                        if (!field) return false;
                        if (typeof field === 'object' && 'value' in field) {
                            return Boolean(field.value);
                        }
                        return Boolean(field);
                    };

                    const existingPool = pools.get(poolId);
                    const pool: Pool = {
                        poolId,
                        title: getString(poolData.title),
                        description: getString(poolData.description),
                        category: getString(poolData.category),
                        outcomeA: getString(poolData['outcome-a']),
                        outcomeB: getString(poolData['outcome-b']),
                        creator: getString(poolData.creator),
                        expiry: getNum(poolData.expiry),
                        tokenType: getNum(poolData['token-type']),
                        totalA: getNum(poolData['total-a']),
                        totalB: getNum(poolData['total-b']),
                        settled: getBool(poolData.settled),
                        winningOutcome: poolData['winning-outcome']?.value?.value,
                        depositClaimed: getBool(poolData['deposit-claimed']),
                        createdAt: existingPool?.createdAt || new Date(),
                        updatedAt: new Date(),
                    };

                    pools.set(poolId, pool);
                    const tokenSymbol = pool.tokenType === 1 ? 'USDCx' : 'STX';
                    console.log(`   Synced pool #${poolId} - "${pool.title}" (${tokenSymbol})`);
                }
            } catch (parseError) {
                console.error(`   Parse error for pool ${poolId}:`, parseError);
            }
        }
    } catch (error) {
        console.error(`   Failed to sync pool ${poolId}:`, error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  🎯 Prediction Market + Pools Indexer        ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Server:    http://localhost:${PORT}            ║`);
    console.log('║  Chainhook: /api/chainhook                   ║');
    console.log('║  Contracts:                                  ║');
    console.log('║    - prediction-market-v2 (Rounds)           ║');
    console.log('║    - prediction-pools (Custom Pools)         ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    console.log('Waiting for blockchain events...\n');

    // Initial sync on startup
    syncFromBlockchain();
    syncPoolsFromBlockchain();
});

