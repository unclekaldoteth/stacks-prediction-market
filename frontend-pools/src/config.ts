// Contract configuration for unified prediction market
// Supports both prediction-market-v2 (rounds) and prediction-pools

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM';

// Contract names
export const CONTRACT_NAME_ROUNDS = 'prediction-market-v2';
export const CONTRACT_NAME_POOLS = 'prediction-pools';

export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// WalletConnect Project ID
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'ac145858a573003e1ae012b1a5d736f4';

// Magic Link API Key for email/social login
export const MAGIC_API_KEY = process.env.NEXT_PUBLIC_MAGIC_API_KEY || 'pk_live_8CCA4D48B89CF2D7';

// Token types for prediction-pools
export const TOKEN_STX = 0;
export const TOKEN_USDCX = 1;

// Amounts in microunits (6 decimals)
export const MIN_BET_STX = 1000000; // 1 STX
export const MIN_BET_USDCX = 1000000; // 1 USDC
export const POOL_DEPOSIT_STX = 5000000; // 5 STX
export const POOL_DEPOSIT_USDCX = 5000000; // 5 USDC

// Direction constants for prediction-market-v2
export const DIRECTION_DOWN = 0;
export const DIRECTION_UP = 1;

// Hiro API
export const HIRO_API = NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';

// Token display helpers
export function formatTokenAmount(amount: number, tokenType: number): string {
    const value = amount / 1000000;
    if (tokenType === TOKEN_USDCX) {
        return `$${value.toFixed(2)}`;
    }
    return `${value.toFixed(2)} STX`;
}

export function formatSTX(microSTX: number): string {
    return `${(microSTX / 1000000).toFixed(2)} STX`;
}

export function getTokenSymbol(tokenType: number): string {
    return tokenType === TOKEN_USDCX ? 'USDCx' : 'STX';
}
