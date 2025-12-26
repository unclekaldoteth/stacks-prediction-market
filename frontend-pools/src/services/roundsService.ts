// Service for reading round data from prediction-market-v2 contract
import { CONTRACT_ADDRESS, CONTRACT_NAME_ROUNDS, HIRO_API, API_URL } from '@/config';
import { cvToValue, hexToCV, uintCV, cvToHex } from '@stacks/transactions';

export interface Round {
    roundId: number;
    status: 'open' | 'closed' | 'resolved';
    startPrice: number;
    endPrice: number;
    poolUp: number;
    poolDown: number;
    winningDirection: number;
    startBlock: number;
}

// Get current round ID
export async function getCurrentRoundId(): Promise<number> {
    try {
        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME_ROUNDS}/get-current-round-id`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [],
                }),
            }
        );

        if (!response.ok) {
            console.warn('Hiro API returned non-ok status:', response.status);
            return 0;
        }

        const data = await response.json();
        if (data.okay && data.result) {
            const cv = hexToCV(data.result);
            return Number(cvToValue(cv));
        }
        return 0;
    } catch (error) {
        console.error('Failed to get current round ID:', error);
        return 0;
    }
}

// Get round by ID
export async function getRound(roundId: number): Promise<Round | null> {
    try {
        const roundIdHex = cvToHex(uintCV(roundId));

        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME_ROUNDS}/get-round`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [roundIdHex],
                }),
            }
        );

        if (!response.ok) {
            console.warn('Hiro API returned non-ok status:', response.status);
            return null;
        }

        const data = await response.json();
        if (data.okay && data.result && data.result !== '0x09') {
            const cv = hexToCV(data.result);
            const parsed = cvToValue(cv) as Record<string, unknown>;

            if (parsed) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const roundData = (parsed as any).value || parsed;

                const statusNum = Number(roundData.status?.value || roundData.status || 0);
                let status: 'open' | 'closed' | 'resolved' = 'open';
                if (statusNum === 1) status = 'open';
                if (statusNum === 2) status = 'closed';
                if (statusNum === 3) status = 'resolved';

                return {
                    roundId,
                    status,
                    startPrice: Number(roundData['start-price']?.value || roundData['start-price'] || 0),
                    endPrice: Number(roundData['end-price']?.value || roundData['end-price'] || 0),
                    poolUp: Number(roundData['pool-up']?.value || roundData['pool-up'] || 0),
                    poolDown: Number(roundData['pool-down']?.value || roundData['pool-down'] || 0),
                    winningDirection: Number(roundData['winning-direction']?.value || roundData['winning-direction'] || 0),
                    startBlock: Number(roundData['start-block']?.value || roundData['start-block'] || 0),
                };
            }
        }
        return null;
    } catch (error) {
        console.error(`Failed to get round ${roundId}:`, error);
        return null;
    }
}

// Get all rounds
export async function getAllRounds(): Promise<Round[]> {
    try {
        const currentId = await getCurrentRoundId();
        const rounds: Round[] = [];

        for (let i = 1; i <= currentId; i++) {
            const round = await getRound(i);
            if (round) {
                rounds.push(round);
            }
        }

        return rounds;
    } catch (error) {
        console.error('Failed to get all rounds:', error);
        return [];
    }
}

// Get BTC price - try backend first, then fallback to direct CoinGecko
export async function getBTCPrice(): Promise<number> {
    // Try backend API first (if running)
    try {
        const response = await fetch(`${API_URL}/api/prices`, {
            signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        if (response.ok) {
            const data = await response.json();
            if (data.btc) return data.btc;
        }
    } catch {
        // Backend not available, fallback to direct API
    }

    // Fallback: Use a CORS-friendly proxy or return cached/mock data
    try {
        // Try CoinGecko directly (may fail due to CORS in browser)
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
            { signal: AbortSignal.timeout(5000) }
        );
        if (response.ok) {
            const data = await response.json();
            return data.bitcoin?.usd || 0;
        }
    } catch (error) {
        console.warn('CoinGecko API unavailable, using fallback price');
    }

    // Final fallback: Return approximate price (will be updated when backend is running)
    return 97000; // Approximate BTC price as fallback
}
