# Stacks Prediction Market

A decentralized prediction market built on Stacks with Clarity 4, enabling BTC price predictions and user-created custom pools.

Stacks Prediction Market allows users to bet on BTC price movements or create their own prediction pools. Supports both STX and USDCx tokens with seamless wallet integration including WalletConnect for mobile wallets.

---

## Why Stacks Prediction Market?

Prediction markets unlock the wisdom of crowds for any outcome - but most are centralized, custodial, and limited in scope.

**Stacks Prediction Market fixes this.**
Anyone can create custom prediction pools on any topic. Outcomes are settled by pool creators with full transparency. Winners automatically claim their proportional share of the pool.

---

## Key Features

### For Bettors
- Bet on BTC price movements (UP/DOWN) in timed rounds
- Join any user-created prediction pool
- Bet with STX or USDCx tokens
- Cross-platform wallet support via Stacks Connect and WalletConnect
- Mobile wallet connectivity via Reown AppKit
- Simple Google login via Magic Link

### For Pool Creators
- Create prediction pools on any topic
- Set custom outcomes (binary choices)
- Refundable deposit system (5 STX/USDCx)
- Settle pools and distribute winnings
- Earn credibility through fair settlements

### For Developers
- Clarity 4 smart contracts with modern syntax
- Well-documented contract interface
- REST API for data access
- Chainhook integration for real-time events

---

## Architecture Overview

### Smart Contracts (Clarity 4)

- **Prediction Pools**
  User-created prediction markets with custom outcomes and dual-token support.

- **Prediction Market V2**
  Admin-managed BTC price prediction rounds with automated settlement.

- **Asset Allowances**
  Clarity 4 `as-contract?` with `with-stx` and `with-ft` for secure token handling.

```
stacks-prediction/
├── contracts/
│   ├── prediction-market-v2.clar   # BTC price rounds
│   ├── prediction-pools.clar       # Custom pools (local)
│   ├── prediction-pools-mainnet.clar # Custom pools (mainnet)
│   └── mock-usdcx.clar             # Test token
├── frontend-pools/                  # Next.js application
├── backend/                         # Node.js indexer + API
└── deployments/                     # Clarinet deployment plans
```

### API + App

- REST endpoints for rounds and pools
- Real-time BTC/STX price feeds
- User bet history and statistics
- Admin dashboard for round management

---

## Live Demo

**Frontend:** https://stacks-prediction-market.vercel.app

**Backend API:** https://stacks-prediction-market-production.up.railway.app

---

## Mainnet Deployment

### Smart Contract Live on Stacks Mainnet

The prediction-pools contract is successfully deployed and verified on Stacks Mainnet.

**Deployer Address:** `SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T`

### Deployed Contract

| Contract Name | Description |
|--------------|-------------|
| **prediction-pools** | Custom prediction pools with STX/USDCx support |

### Deployment Details

- **Network:** Stacks Mainnet
- **Deployment Cost:** 0.200000 STX
- **Deployment Date:** December 28, 2025
- **Clarity Version:** 4
- **Epoch:** 3.3
- **Status:** Confirmed on-chain

### Explorer Links

View contract on Stacks Explorer:
https://explorer.hiro.so/address/SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T?chain=mainnet

### Contract Address for Integration

```clarity
;; Main Prediction Pools Contract
SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T.prediction-pools

;; USDCx Token (Circle xReserve)
SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx
```

---

## Smart Contract Functions

### prediction-pools

| Function | Description |
|----------|-------------|
| `create-pool` | Create a pool with 5 STX/USDCx deposit |
| `place-bet` | Bet on outcome A or B |
| `settle-pool` | Creator settles with winning outcome |
| `claim-winnings` | Winners claim proportional rewards |
| `claim-deposit` | Creator reclaims deposit after settlement |
| `request-refund` | Refund for expired unsettled pools |

### prediction-market-v2

| Function | Description |
|----------|-------------|
| `start-round` | Admin starts a new betting round |
| `place-bet` | Bet STX on UP or DOWN |
| `resolve-round` | Admin resolves with final BTC price |
| `claim-winnings` | Winners claim their share |

---

## Wallet Integration

The application supports multiple wallet connection methods:

### Stacks Wallet (Leather/Xverse)
Browser extension wallets for desktop users.

### WalletConnect
Mobile wallet connectivity via Reown AppKit. Supports any WalletConnect-compatible wallet.

### Magic Link
Email-based authentication for users without crypto wallets.

### Implementation

```typescript
import { connect, getLocalStorage, disconnect } from '@stacks/connect';

// Connect with WalletConnect support
await connect({
    walletConnectProjectId: 'your-project-id',
    network: 'mainnet', // or 'testnet'
});

// Get connected address
const userData = getLocalStorage();
const address = userData?.addresses?.stx?.[0]?.address;

// Disconnect
await disconnect();
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Clarinet 3.11+
- Stacks wallet (Leather or Xverse)

### Frontend

```bash
cd frontend-pools
npm install
npm run dev
# Opens at http://localhost:3002
```

### Backend

```bash
cd backend
npm install
npm run dev
# API at http://localhost:3001
```

### Smart Contracts

```bash
# Check contracts
clarinet check

# Run tests
npm test

# Deploy to mainnet
clarinet deployments apply -p deployments/prediction-pools.mainnet-plan.yaml
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rounds` | GET | List all prediction rounds |
| `/api/rounds/:id` | GET | Get specific round details |
| `/api/pools` | GET | List all prediction pools |
| `/api/pools/:id` | GET | Get specific pool details |
| `/api/pools/:id/bets` | GET | Get bets for a pool |
| `/api/user/:address/pools` | GET | Get user's pool bets |
| `/api/prices` | GET | Current BTC/STX prices |

---

## Environment Variables

### Frontend (.env.local)

```
NEXT_PUBLIC_CONTRACT_ADDRESS=SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_MAGIC_API_KEY=your_magic_key
NEXT_PUBLIC_API_URL=https://stacks-prediction-market-production.up.railway.app
```

### Backend (.env)

```
PORT=3001
STACKS_NETWORK=mainnet
STACKS_API_URL=https://api.hiro.so
```

---

## Tech Stack

### Frontend
- Next.js 15
- React 19
- TypeScript
- Stacks Connect v8
- Reown AppKit (WalletConnect)
- Magic SDK

### Backend
- Node.js
- Express
- TypeScript
- Hiro Chainhooks

### Smart Contracts
- Clarity 4
- Stacks Blockchain
- Epoch 3.3

---

## Roadmap

### Phase 1 - Core System (Completed)

- [x] Prediction pools smart contract
- [x] STX betting support
- [x] Pool creation and settlement
- [x] Mainnet deployment with Clarity 4

### Phase 2 - Token Support (Completed)

- [x] USDCx integration (Circle xReserve)
- [x] Dual-token betting
- [x] Deposit/refund system

### Phase 3 - Frontend (Completed)

- [x] Next.js application
- [x] Wallet integration via Stacks Connect
- [x] WalletConnect via Reown AppKit
- [x] Magic Link authentication
- [x] Admin dashboard

### Phase 4 - Backend Services (In Progress)

- [x] Event indexer
- [x] REST API
- [x] Railway deployment
- [ ] Chainhooks integration
- [ ] WebSocket real-time updates

---

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

---

## License

MIT

---

## Acknowledgments

- Stacks Foundation for blockchain infrastructure
- Hiro for developer tools and APIs
- Circle for USDCx via xReserve
- Reown for WalletConnect integration
