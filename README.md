# Stacks Prediction Market

A decentralized binary prediction market built on the Stacks blockchain. Users bet STX on whether BTC price will go UP or DOWN.

![Stacks](https://img.shields.io/badge/Stacks-Testnet-purple)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Clarity](https://img.shields.io/badge/Clarity-2.0-blue)

## Live Demo

- **Frontend**: [stacks-prediction-market.vercel.app](https://stacks-prediction-market.vercel.app)
- **Contract**: [`ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM.prediction-market-v2`](https://explorer.hiro.so/txid/0x9d90212e1d812d8e1e8486522227d141ee55b2a6d4b4cae1709daebc9fb4bacd?chain=testnet)

## Features

- 🎲 **Binary Predictions** - Bet UP or DOWN on BTC price
- 💰 **STX Betting** - Use native Stacks tokens
- 📊 **Live Price Feeds** - Real-time BTC/STX prices via CoinGecko
- 🔗 **WalletConnect** - Connect with Leather, Xverse, or mobile wallets
- 📧 **Magic Link** - Email & Google social login
- 🔒 **Admin Controls** - Restricted admin panel for round management
- ⏱️ **Real-time Sync** - Live blockchain data updates

## Architecture

```
stacks-prediction/
├── contracts/                 # Clarity smart contracts
│   ├── prediction-market.clar       # Original contract
│   └── prediction-market-v2.clar    # Fixed contract (current)
├── frontend/                  # Next.js 15 web app
│   └── src/
│       ├── app/              # Pages (home, admin)
│       ├── components/       # BettingPanel, AdminPanel, Header
│       └── context/          # WalletContext (auth)
├── backend/                   # Node.js indexer
│   └── src/indexer.ts        # Blockchain sync + API
└── deployments/              # Clarinet deployment plans
```

## Smart Contract (v2)

The `prediction-market-v2` contract includes:

| Function | Description |
|----------|-------------|
| `start-round` | Admin starts new betting round with BTC price |
| `place-bet` | User bets STX on UP (1) or DOWN (0) |
| `end-round` | Admin closes betting period |
| `resolve-round` | Admin sets winning direction based on final price |
| `claim-winnings` | Winners claim their share of the pool |

**Safety Features:**
- ✅ Minimum bet: 1 STX
- ✅ Division-by-zero protection
- ✅ Fixed claim-winnings transfer bug

## Quick Start

### Prerequisites
- Node.js 18+
- [Clarinet](https://docs.hiro.so/clarinet) (for contract development)
- Stacks wallet (Leather or Xverse)

### Backend
```bash
cd backend
npm install
npm run dev
# API runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

### Contract Deployment
```bash
# Check contract
clarinet check

# Deploy to testnet
clarinet deployments apply -p deployments/v2.testnet-plan.yaml
```

## How It Works

1. **Admin starts round** with current BTC price as reference
2. **Users bet** UP or DOWN (minimum 1 STX)
3. **Admin ends betting** when round timer expires
4. **Admin resolves** with final BTC price
5. **Winners claim** proportional share of total pool

### Payout Calculation
```
user_share = (user_bet * total_pool) / winning_pool
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Contract | Clarity 2.0 |
| Frontend | Next.js 15, React 19, TypeScript |
| Backend | Express, TypeScript |
| Wallet | @stacks/connect, WalletConnect, Magic Link |
| APIs | Hiro Stacks API, CoinGecko |
| Deploy | Vercel (frontend), Railway (backend) |

## Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM
NEXT_PUBLIC_CONTRACT_NAME=prediction-market-v2
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_MAGIC_API_KEY=your_magic_key
```

### Backend
```env
CONTRACT_ADDRESS=ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM
CONTRACT_NAME=prediction-market-v2
PORT=3001
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/rounds` | List all rounds |
| `GET /api/rounds/:id` | Get specific round |
| `GET /api/bets` | List all bets (filter by `?roundId=X&user=Y`) |
| `GET /api/prices` | Current BTC/STX prices |
| `POST /api/chainhook` | Webhook for blockchain events |

## Security

- Admin functions restricted to contract deployer
- `/admin` page protected by wallet verification
- STX transfers validated on-chain
- No private keys stored in frontend

## License

MIT

## Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

Built with ❤️ on [Stacks](https://stacks.co)
