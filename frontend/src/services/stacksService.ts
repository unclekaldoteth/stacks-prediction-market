// Service to read data directly from the Stacks blockchain via Hiro API
import { CONTRACT_ADDRESS, CONTRACT_NAME, NETWORK } from '@/config';

const HIRO_API = NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';

interface RoundData {
    roundId: number;
    status: 'open' | 'closed' | 'resolved';
    startPrice: number;
    endPrice: number;
    poolUp: number;
    poolDown: number;
    winningDirection: number;
    startBlock: number;
}

// Read the current round ID from the contract
export async function getCurrentRoundId(): Promise<number> {
    try {
        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-current-round-id`,
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
            // Parse clarity uint response (0x0100000000000000000000000000000001 format)
            const hexValue = data.result.slice(2); // Remove '0x'
            const typePrefix = hexValue.slice(0, 2);
            if (typePrefix === '01') {
                // uint type
                const value = parseInt(hexValue.slice(2), 16);
                return value;
            }
        }
        return 0;
    } catch (error) {
        console.error('Failed to get current round ID:', error);
        return 0;
    }
}

// Read round data from the contract
export async function getRoundData(roundId: number): Promise<RoundData | null> {
    try {
        // Convert roundId to Clarity uint hex format
        const roundIdHex = '0x01' + roundId.toString(16).padStart(32, '0');

        const response = await fetch(
            `${HIRO_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-round`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: CONTRACT_ADDRESS,
                    arguments: [roundIdHex],
                }),
            }
        );

        const data = await response.json();

        if (data.okay && data.result) {
            // Parse the optional tuple response
            const result = parseClarityValue(data.result);
            if (result) {
                return {
                    roundId,
                    status: parseStatus(result.status),
                    startPrice: result['start-price'] || 0,
                    endPrice: result['end-price'] || 0,
                    poolUp: result['pool-up'] || 0,
                    poolDown: result['pool-down'] || 0,
                    winningDirection: result['winning-direction'] || 0,
                    startBlock: result['start-block'] || 0,
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Failed to get round data:', error);
        return null;
    }
}

// Get all active rounds
export async function getAllRounds(): Promise<RoundData[]> {
    const currentRoundId = await getCurrentRoundId();
    const rounds: RoundData[] = [];

    for (let i = 1; i <= currentRoundId; i++) {
        const round = await getRoundData(i);
        if (round) {
            rounds.push(round);
        }
    }

    return rounds;
}

// Parse Clarity value from hex
function parseClarityValue(hex: string): Record<string, number> | null {
    try {
        // This is a simplified parser - in production use @stacks/transactions
        // For now, we'll return mock data for testing
        // The actual parsing would decode the Clarity tuple

        // If the response starts with 0x0a (some/optional with value), parse the tuple
        if (hex.startsWith('0x0a') || hex.startsWith('0x0c')) {
            // Has value - need proper Clarity decoding
            // For MVP, we'll use backend API instead
            return null;
        }
        return null;
    } catch {
        return null;
    }
}

function parseStatus(statusNum: number): 'open' | 'closed' | 'resolved' {
    switch (statusNum) {
        case 0: return 'open';
        case 1: return 'closed';
        case 2: return 'resolved';
        default: return 'open';
    }
}
