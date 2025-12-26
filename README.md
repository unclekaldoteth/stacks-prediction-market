# Stacks Prediction Market

Decentralized prediction market on Stacks blockchain with BTC price predictions and user-created custom pools.

## Features

- **BTC Rounds** - Binary predictions on BTC price (UP/DOWN)
- **Prediction Pools** - User-created custom prediction markets
- **Dual Token** - Bet with STX or USDCx
- **Gmail Login** - Google authentication via Magic Link
- **WalletConnect** - Connect with Leather, Xverse, or mobile wallets

## Architecture

```
stacks-prediction/
├── contracts/
│   ├── prediction-market-v2.clar   # BTC rounds
│   ├── prediction-pools.clar       # Custom pools
│   └── mock-usdcx.clar             # Test token
├── frontend-pools/                  # Unified Next.js app
├── backend/                         # Node.js indexer
└── deployments/                     # Clarinet plans
```

## Smart Contracts

### prediction-pools

| Function | Description |
|----------|-------------|
| create-pool | Create pool (5 STX/USDCx deposit) |
| place-bet | Bet on outcome A or B |
| settle-pool | Creator picks winner |
| claim-winnings | Winners claim rewards |

### prediction-market-v2

| Function | Description |
|----------|-------------|
| start-round | Admin starts betting round |
| place-bet | Bet STX on UP or DOWN |
| resolve-round | Admin sets winner |
| claim-winnings | Winners claim share |

## Quick Start

### Frontend
```bash
cd frontend-pools
npm install
npm run dev
# http://localhost:3002
```

### Backend
```bash
cd backend
npm install
npm run dev
# http://localhost:3001
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/rounds | List rounds |
| GET /api/pools | List pools |
| GET /api/pools/:id | Get pool |
| GET /api/prices | BTC/STX prices |

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_CONTRACT_ADDRESS=ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_MAGIC_API_KEY=your_magic_key
```

## Deploy

Deploy frontend-pools to Vercel:
```bash
cd frontend-pools
vercel
```

## License

MIT
