// Service for reading pool data from Stacks blockchain
// Priority: Backend API (faster, cached) > Hiro API (direct, slower)
import { CONTRACT_ADDRESS, CONTRACT_NAME_POOLS, HIRO_API, API_URL } from '@/config';
import { cvToValue, hexToCV, uintCV, cvToHex, principalCV } from '@stacks/transactions';

export interface Pool {
    poolId: number;
    title: string;
    description: string;
    outcomeA: string;
    outcomeB: string;
    category: string;
    creator: string;
    expiry: number;
    totalA: number;
    totalB: number;
    tokenType: number;
    settled: boolean;
    winningOutcome: number | null;
    depositClaimed: boolean;
}

export interface UserBet {
    amountA: number;
    amountB: number;
}

// Try backend API first, fallback to Hiro
export async function getAllPools(): Promise<Pool[]> {
    // Try backend first (cached, faster)
    try {
        const response = await fetch(`${API_URL}/api/pools`, {
            signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
            const data = await response.json();
            // Ensure data matches frontend format
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.map((p: any) => ({
                poolId: p.poolId,
                title: p.title || '',
                description: p.description || '',
                outcomeA: p.outcomeA || p['outcome-a'] || '',
                outcomeB: p.outcomeB || p['outcome-b'] || '',
                category: p.category || '',
                creator: p.creator || '',
                expiry: p.expiry || 0,
                totalA: p.totalA || p['total-a'] || 0,
                totalB: p.totalB || p['total-b'] || 0,
                tokenType: p.tokenType || p['token-type'] || 0,
                settled: Boolean(p.settled),
                winningOutcome: p.winningOutcome ?? p['winning-outcome'] ?? null,
                depositClaimed: Boolean(p.depositClaimed || p['deposit-claimed']),
            }));
        }
    } catch {
        // Backend not available, use Hiro API
    }

    // Fallback to Hiro API (direct)
    const count = await getPoolCount();
    const pools: Pool[] = [];

    for (let i = 0; i < count; i++) {
        const pool = await getPool(i);
        if (pool) {
            pools.push(pool);
        }
    }

    return pools;
}

// Get pool count from Hiro API
export async function getPoolCount(): Promise<number> {
    try {
        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME_POOLS}/get-pool-count`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [],
                }),
            }
        );

        const data = await response.json();
        if (data.okay && data.result) {
            const cv = hexToCV(data.result);
            return Number(cvToValue(cv));
        }
        return 0;
    } catch (error) {
        console.error('Failed to get pool count:', error);
        return 0;
    }
}

// Get pool by ID - try backend first
export async function getPool(poolId: number): Promise<Pool | null> {
    // Try backend first
    try {
        const response = await fetch(`${API_URL}/api/pools/${poolId}`, {
            signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
            const p = await response.json();
            return {
                poolId: p.poolId,
                title: p.title || '',
                description: p.description || '',
                outcomeA: p.outcomeA || p['outcome-a'] || '',
                outcomeB: p.outcomeB || p['outcome-b'] || '',
                category: p.category || '',
                creator: p.creator || '',
                expiry: p.expiry || 0,
                totalA: p.totalA || p['total-a'] || 0,
                totalB: p.totalB || p['total-b'] || 0,
                tokenType: p.tokenType || p['token-type'] || 0,
                settled: Boolean(p.settled),
                winningOutcome: p.winningOutcome ?? p['winning-outcome'] ?? null,
                depositClaimed: Boolean(p.depositClaimed || p['deposit-claimed']),
            };
        }
    } catch {
        // Fall through to Hiro
    }

    // Fallback to Hiro API
    try {
        const poolIdHex = cvToHex(uintCV(poolId));

        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME_POOLS}/get-pool`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [poolIdHex],
                }),
            }
        );

        const data = await response.json();
        if (data.okay && data.result && data.result !== '0x09') {
            const cv = hexToCV(data.result);
            const parsed = cvToValue(cv) as Record<string, unknown>;

            if (parsed) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const poolData = (parsed as any).value || parsed;

                return {
                    poolId,
                    title: String(poolData.title?.value || poolData.title || ''),
                    description: String(poolData.description?.value || poolData.description || ''),
                    outcomeA: String(poolData['outcome-a']?.value || poolData['outcome-a'] || ''),
                    outcomeB: String(poolData['outcome-b']?.value || poolData['outcome-b'] || ''),
                    category: String(poolData.category?.value || poolData.category || ''),
                    creator: String(poolData.creator?.value || poolData.creator || ''),
                    expiry: Number(poolData.expiry?.value || poolData.expiry || 0),
                    totalA: Number(poolData['total-a']?.value || poolData['total-a'] || 0),
                    totalB: Number(poolData['total-b']?.value || poolData['total-b'] || 0),
                    tokenType: Number(poolData['token-type']?.value || poolData['token-type'] || 0),
                    settled: Boolean(poolData.settled?.value ?? poolData.settled ?? false),
                    winningOutcome: poolData['winning-outcome']?.value?.value ?? poolData['winning-outcome'] ?? null,
                    depositClaimed: Boolean(poolData['deposit-claimed']?.value ?? poolData['deposit-claimed'] ?? false),
                };
            }
        }
        return null;
    } catch (error) {
        console.error(`Failed to get pool ${poolId}:`, error);
        return null;
    }
}

// Get user bet for a pool (always from Hiro - real-time data)
export async function getUserBet(poolId: number, userAddress: string): Promise<UserBet | null> {
    try {
        const poolIdHex = cvToHex(uintCV(poolId));
        const userHex = cvToHex(principalCV(userAddress));

        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME_POOLS}/get-user-bet`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [poolIdHex, userHex],
                }),
            }
        );

        const data = await response.json();
        if (data.okay && data.result && data.result !== '0x09') {
            const cv = hexToCV(data.result);
            const parsed = cvToValue(cv) as Record<string, unknown>;

            if (parsed) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const betData = (parsed as any).value || parsed;
                return {
                    amountA: Number(betData['amount-a']?.value || betData['amount-a'] || 0),
                    amountB: Number(betData['amount-b']?.value || betData['amount-b'] || 0),
                };
            }
        }
        return null;
    } catch (error) {
        console.error(`Failed to get user bet:`, error);
        return null;
    }
}

// Get minimum bet amount for token type
export async function getMinBetAmount(tokenType: number): Promise<number> {
    try {
        const tokenTypeHex = cvToHex(uintCV(tokenType));

        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME_POOLS}/get-min-bet-amount`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [tokenTypeHex],
                }),
            }
        );

        const data = await response.json();
        if (data.okay && data.result) {
            const cv = hexToCV(data.result);
            return Number(cvToValue(cv));
        }
        return 1000000; // Default 1 token
    } catch (error) {
        console.error('Failed to get min bet amount:', error);
        return 1000000;
    }
}

// Get pool stats from backend (if available)
export async function getPoolStats(): Promise<{
    totalPools: number;
    activePools: number;
    settledPools: number;
    totalVolumeSTX: number;
    totalVolumeUSDCx: number;
    totalBets: number;
} | null> {
    try {
        const response = await fetch(`${API_URL}/api/pools/stats/summary`, {
            signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
            return await response.json();
        }
    } catch {
        // Backend not available
    }
    return null;
}
