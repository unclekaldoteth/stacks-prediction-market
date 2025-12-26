// Service for reading pool data from Stacks blockchain via Hiro API
import { CONTRACT_ADDRESS, CONTRACT_NAME_POOLS, HIRO_API } from '@/config';
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

// Get pool count
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

// Get pool by ID
export async function getPool(poolId: number): Promise<Pool | null> {
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

// Get all pools
export async function getAllPools(): Promise<Pool[]> {
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

// Get user bet for a pool
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
