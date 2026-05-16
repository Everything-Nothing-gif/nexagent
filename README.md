# NexAgent — AI Commerce Agent on Algorand

> Search products across major stores, compare prices in real time, and purchase via Algorand smart contract escrow.

![Algorand](https://img.shields.io/badge/Algorand-Testnet-1d9e75?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## What It Does

NexAgent is a conversational commerce agent that:

- Searches real product listings across major retailers via SerpAPI
- Compares prices and highlights the best deal
- Lets users purchase using **Algorand testnet ALGO** via Pera Wallet
- Holds funds in a **smart contract escrow** until the buyer confirms delivery
- Allows full **refund/cancel** before delivery confirmation

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                 │
│                                                      │
│  React + Vite                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   App.jsx   │  │ ProductCard  │  │ WalletBar  │  │
│  │  (chat UI)  │  │ (buy/escrow) │  │ (Pera conn)│  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                │                │          │
│  ┌──────▼──────┐  ┌──────▼───────┐        │          │
│  │  agent.js   │  │ algorand.js  │◄───────┘          │
│  │ (search)    │  │ (txns/wallet)│                   │
│  └──────┬──────┘  └──────┬───────┘                   │
└─────────┼────────────────┼─────────────────────────-─┘
          │                │
          ▼                ▼
┌─────────────────┐  ┌─────────────────────────────────┐
│  Backend        │  │  Algorand Testnet               │
│  (Render)       │  │                                 │
│                 │  │  ┌──────────────────────────┐   │
│  Express/Node   │  │  │  Smart Contract (AVM 8)  │   │
│  + SerpAPI      │  │  │  APP ID: 762562805        │   │
│  /api/search    │  │  │  Escrow logic in TEAL     │   │
└─────────────────┘  │  └──────────────────────────┘   │
                     │  ┌──────────┐                    │
                     │  │   Pera   │ ← signs txns       │
                     │  │  Wallet  │                    │
                     │  └──────────┘                    │
                     └─────────────────────────────────┘
```

---

## Project Structure

```
nexagent/
├── src/
│   ├── components/
│   │   ├── ChatMessage.jsx     # Chat bubble + product grid renderer
│   │   ├── ProductCard.jsx     # Product card with buy/confirm/cancel
│   │   └── WalletBar.jsx       # Header with Pera Wallet connect
│   ├── hooks/
│   │   └── useWallet.js        # Wallet state, opt-in, balance, status
│   ├── lib/
│   │   ├── agent.js            # Product search + fallback replies
│   │   └── algorand.js         # Algorand txns, wallet, contract calls
│   ├── App.jsx                 # Root component, chat state
│   ├── main.jsx                # React entry point
│   └── index.css               # Global styles + CSS variables
├── server/
│   ├── index.js                # Express backend — /api/search via SerpAPI
│   └── package.json
├── scripts/
│   ├── deploy.py               # Algorand smart contract deployment
│   └── deployment.json         # Deployed app ID + address
├── index.html
├── package.json
├── vite.config.js
└── .env                        # Local env variables (never commit)
```

---

## Smart Contract

The escrow contract is written in TEAL (Transaction Execution Approval Language) and deployed on Algorand Testnet.

### Contract Details

| Field | Value |
|---|---|
| App ID | `762562805` |
| App Address | `D5F3JBMY3DTKNKAGW5WFL4UWRJQS5QLJCPH54RTJGVSWB4A5UQQJUF23FM` |
| Network | Algorand Testnet |
| AVM Version | 8 |

### State Schema

**Global state (2 uints):**

| Key | Type | Description |
|---|---|---|
| `total_orders` | uint | Total number of escrows ever created |
| `total_volume` | uint | Total microALGO that has passed through the contract |

**Local state per user (2 uints, 1 byte slice):**

| Key | Type | Description |
|---|---|---|
| `status` | uint | Current escrow status (see below) |
| `amount` | uint | microALGO held in escrow |
| `order_id` | bytes | Order ID string |

### Status Codes

| Code | Name | Description |
|---|---|---|
| `0` | empty | Opted in, no active escrow |
| `1` | escrowed | Funds locked in contract |
| `2` | released | Delivery confirmed, funds sent to buyer |
| `3` | refunded | Escrow cancelled, funds returned |

### Contract Methods

#### `create_escrow(order_id)`
Creates a new escrow. Must be called as part of a **group transaction** with a payment to the contract address.

- Allowed from status: `0`, `2`, `3`
- Sets status → `1`
- Stores amount and order ID in local state
- Increments global `total_orders` and `total_volume`

#### `confirm_delivery()`
Buyer confirms they received the order. Contract sends funds back to the buyer via inner transaction.

- Allowed from status: `1`
- Sets status → `2`
- Clears amount from local state
- Sends `amount - 1000 microALGO` back to buyer (1000 covers inner txn fee)

#### `cancel_escrow()`
Buyer cancels and requests a refund. Contract sends funds back to the buyer via inner transaction.

- Allowed from status: `1`
- Sets status → `3`
- Clears amount from local state
- Sends `amount - 1000 microALGO` back to buyer

### Purchase Flow

```
User                    App                   Algorand
 │                       │                       │
 │── search product ────►│                       │
 │◄─ product results ────│                       │
 │                       │                       │
 │── click BUY ─────────►│                       │
 │                       │── check opt-in ──────►│
 │                       │◄─ not opted in ───────│
 │                       │── opt-in txn ────────►│
 │◄─ Pera sign prompt ───│                       │
 │── sign ──────────────►│                       │
 │                       │── group txn: ────────►│
 │                       │   [app_call +          │
 │◄─ Pera sign prompt ───│    payment]            │
 │── sign ──────────────►│                       │
 │                       │◄─ confirmed ──────────│
 │◄─ escrow active UI ───│                       │
 │                       │                       │
 │── click CONFIRM ─────►│                       │
 │                       │── confirm_delivery ──►│
 │◄─ Pera sign prompt ───│                       │
 │── sign ──────────────►│                       │
 │                       │◄─ inner txn refund ───│
 │◄─ balance updated ────│                       │
```

---

## Setup Guide

### Prerequisites

- Node.js 18+
- Python 3.10+
- [Pera Wallet](https://perawallet.app/) mobile app
- [SerpAPI](https://serpapi.com/) account (free tier: 100 searches/month)
- Algorand testnet ALGO — get free from [bank.testnet.algorand.network](https://bank.testnet.algorand.network)

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/nexagent.git
cd nexagent
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
cd ..
```

### 4. Deploy the smart contract

```bash
cd scripts
python3 -m venv venv
source venv/bin/activate
pip install algosdk
DEPLOYER_MNEMONIC="your 25 word mnemonic" python deploy.py
```

This will print your `APP_ID` and `APP_ADDRESS`. Save them.

> Your deployer wallet needs ~1 ALGO for deployment fees + 0.2 ALGO to fund the contract.

### 5. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_BACKEND=http://localhost:3001
VITE_APP_ID=your_app_id
VITE_APP_ADDRESS=your_app_address
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=
```

Create a `.env` file in `server/`:

```env
SERPAPI_KEY=your_serpapi_key
```

### 6. Run locally

In one terminal, start the backend:
```bash
cd server
node index.js
```

In another terminal, start the frontend:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment

### Backend — Render

1. Push `server/` to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Root Directory** to `server`
4. Set **Build Command** to `npm install`
5. Set **Start Command** to `node index.js`
6. Add environment variable: `SERPAPI_KEY=your_key`

### Frontend — Vercel

1. Import your GitHub repo on [vercel.com](https://vercel.com)
2. Add environment variables in **Settings → Environment Variables**:
   ```
   VITE_BACKEND=https://your-render-url.onrender.com
   VITE_APP_ID=your_app_id
   VITE_APP_ADDRESS=your_app_address
   VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
   VITE_ALGOD_PORT=
   ```
3. Deploy

---

## Environment Variables Reference

| Variable | Where | Description |
|---|---|---|
| `VITE_BACKEND` | Frontend | URL of the Express backend |
| `VITE_APP_ID` | Frontend | Algorand smart contract App ID |
| `VITE_APP_ADDRESS` | Frontend | Algorand smart contract address |
| `VITE_ALGOD_SERVER` | Frontend | Algorand node URL |
| `VITE_ALGOD_PORT` | Frontend | Algorand node port (leave empty for Algonode) |
| `SERPAPI_KEY` | Backend | SerpAPI key for Google Shopping results |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5 |
| Styling | Inline styles, CSS variables, Syne + DM Mono fonts |
| Wallet | Pera Wallet via `@perawallet/connect` |
| Blockchain | Algorand Testnet, algosdk v3 |
| Smart Contract | TEAL (AVM 8) |
| Backend | Node.js, Express |
| Product Search | SerpAPI Google Shopping |
| Frontend Host | Vercel |
| Backend Host | Render |

---

## Known Limitations

- **Testnet only** — not for real funds
- **Single escrow per wallet** — one active order at a time per address
- **Render free tier** — backend may have ~30s cold start after inactivity
- **ALGO rate** — hardcoded at `$0.18/ALGO`; not fetched live

---

## License

MIT
