// Contract configuration
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM';
export const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'prediction-market';
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Reown AppKit Project ID (formerly WalletConnect)
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'ac145858a573003e1ae012b1a5d736f4';

// Magic Link API Key
export const MAGIC_API_KEY = process.env.NEXT_PUBLIC_MAGIC_API_KEY || 'pk_live_8CCA4D48B89CF2D7';

// Direction constants
export const DIRECTION_DOWN = 0;
export const DIRECTION_UP = 1;
