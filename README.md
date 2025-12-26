# Stacks Prediction Market

A decentralized prediction market platform built on the Stacks blockchain. Features both BTC price predictions and user-created custom prediction pools.

![Stacks](https://img.shields.io/badge/Stacks-Testnet-purple)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Clarity](https://img.shields.io/badge/Clarity-2.0-blue)

## 🎯 Two Prediction Systems

### 1. BTC Rounds (prediction-market-v2)
Binary predictions on BTC price movements. Admin-managed rounds where users bet UP or DOWN.

### 2. Prediction Pools (prediction-pools) ✨ NEW
User-created custom prediction markets with any two outcomes. **Anyone can create pools!**

| Feature | BTC Rounds | Prediction Pools |
|---------|------------|------------------|
| Creator | Admin only | Any user |
| Outcomes | UP / DOWN | Custom (A / B) |
| Token | STX only | STX or USDCx |
| Topics | BTC price | Anything |

## Live Demo

- **Unified Frontend**: [stacks-prediction-market.vercel.app](https://stacks-prediction-market.vercel.app)
- **Contracts**:
  - [`prediction-market-v2`](https://explorer.hiro.so/txid/0x9d90212e1d812d8e1e8486522227d141ee55b2a6d4b4cae1709daebc9fb4bacd?chain=testnet) - BTC Rounds
  - [`prediction-pools`](https://explorer.hiro.so/txid/ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM.prediction-pools?chain=testnet) - Custom Pools

## Features

- **🎯 Custom Pools** - Create your own prediction markets
- **₿ BTC Predictions** - Bet UP or DOWN on Bitcoin price
- **💰 Dual Tokens** - Use STX or USDCx for betting
- **🔐 Gmail Login** - One-click Google authentication via Magic Link
- **👛 WalletConnect** - Connect with Leather, Xverse, or mobile wallets
- **📊 Live Data** - Real-time blockchain data updates

## Architecture

```
stacks-prediction/
├── contracts/                    # Clarity smart contracts
│   ├── prediction-market-v2.clar     # BTC rounds contract
│   ├── prediction-pools.clar         # Custom pools contract ✨
│   └── mock-usdcx.clar               # Test USDCx token
├── frontend-pools/               # Unified Next.js app ✨
│   └── src/
│       ├── components/
│       │   ├── RoundsPanel.tsx       # BTC predictions
│       │   ├── PoolList.tsx          # Pool browser
│       │   ├── CreatePool.tsx        # Pool creation form
│       │   └── BetPanel.tsx          # Betting modal
│       ├── services/                 # API services
│       └── context/                  # Wallet + auth
├── frontend/                     # Legacy frontend (BTC only)
├── backend/                      # Node.js indexer
└── deployments/                  # Clarinet deployment plans
```

## Smart Contracts

### prediction-pools (New)

| Function | Description |
|----------|-------------|
| `create-pool` | Anyone can create a pool (5 STX/USDCx deposit) |
| `place-bet` | Bet on outcome A or B |
| `settle-pool` | Creator picks winning outcome |
| `claim-winnings` | Winners claim proportional rewards |
| `claim-deposit` | Creator reclaims deposit after settlement |
| `request-refund` | Refund if pool expires unsettled |

### prediction-market-v2

| Function | Description |
|----------|-------------|
| `start-round` | Admin starts new betting round |
| `place-bet` | User bets STX on UP (1) or DOWN (0) |
| `end-round` | Admin closes betting period |
| `resolve-round` | Admin sets winning direction |
| `claim-winnings` | Winners claim their share |

## Quick Start

### Prerequisites
- Node.js 18+
- [Clarinet](https://docs.hiro.so/clarinet) (for contract development)
- Stacks wallet (Leather or Xverse)

### Unified Frontend (Recommended)
```bash
cd frontend-pools
npm install
npm run dev
# App runs on http://localhost:3002
```

### Backend (Optional - for indexing)
```bash
cd backend
npm install
npm run dev
# API runs on http://localhost:3001
```

### Contract Deployment
```bash
# Check contracts
clarinet check

# Deploy prediction-pools to testnet
clarinet deployments apply -p deployments/prediction-pools.testnet-plan.yaml
```

## How Prediction Pools Work

1. **Create Pool** - Anyone can create a pool with:
   - Title and description
   - Two outcomes (A and B)
   - Duration in days
   - Token type (STX or USDCx)
   - 5 token deposit (refundable)

2. **Place Bets** - Users bet on either outcome

3. **Settlement** - After expiry, creator settles the pool

4. **Claims** - Winners claim proportional rewards (3% fee)

5. **Deposit Return** - Creator gets deposit back

### Payout Calculation
```
user_payout = (user_bet * total_pool * 0.97) / winning_pool
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Contracts | Clarity 2.0 |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind |
| Backend | Express, TypeScript |
| Wallet | @stacks/connect, WalletConnect, Magic Link |
| APIs | Hiro Stacks API, CoinGecko |
| Deploy | Vercel |

## Environment Variables

### Frontend (`frontend-pools/.env.local`)
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_MAGIC_API_KEY=your_magic_key
```

## Security

- Pool creators can only settle pools after expiry
- Deposits locked until settlement
- Refunds available if pools expire unsettled
- Admin functions restricted to contract deployer
- STX/USDCx transfers validated on-chain

## License

MIT

## Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

Built on [Stacks](https://stacks.co) • Powered by Bitcoin
