# Stacks Prediction Market

A decentralized binary prediction market built on the Stacks blockchain. Users bet STX on whether BTC price will go UP or DOWN.

## Architecture

```
contracts/           Clarity smart contract
frontend/            Next.js 15 web application  
backend/             Node.js indexer with blockchain sync
```

## Smart Contract

The prediction market contract (`prediction-market.clar`) handles:
- Round management (start, end, resolve)
- Bet placement with STX
- Winner calculation based on BTC price movement
- Prize distribution

Deployed on Stacks Testnet:
```
ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM.prediction-market
```

## Quick Start

### Prerequisites
- Node.js 18+
- Clarinet (for contract development)
- Stacks wallet (Leather or Xverse)

### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3002
```

## Features

- WalletConnect integration for mobile wallet support
- Real-time BTC/STX price feeds via CoinGecko
- Blockchain data sync via Hiro Stacks API
- Admin panel for round management

## Tech Stack

- **Contract**: Clarity (Stacks)
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Express, TypeScript
- **Wallet**: @stacks/connect with WalletConnect
- **APIs**: Hiro Stacks API, CoinGecko

## How It Works

1. Admin starts a round with current BTC price as reference
2. Users bet UP or DOWN on BTC price direction
3. Admin ends betting and resolves with final BTC price
4. Winners share the entire pool proportionally

## License

MIT
