# NexAgent — React App

AI Commerce Agent with full Algorand integration.

## Stack
- **React + Vite** — frontend framework
- **Claude API** — AI product search agent
- **algosdk** — Algorand blockchain interaction
- **Pera Wallet** — user wallet connection

## Local Dev

```bash
npm install
cp .env.example .env      # fill in your keys
npm run dev               # → http://localhost:5173
```

## Deploy to Vercel (get your live URL)

### Option A — Vercel CLI (fastest)
```bash
npm install -g vercel
vercel                    # follow prompts
vercel env add VITE_ANTHROPIC_API_KEY
vercel env add VITE_APP_ID
vercel env add VITE_APP_ADDRESS
vercel --prod             # → get your live URL
```

### Option B — GitHub + Vercel dashboard
1. Push this folder to GitHub
2. Go to vercel.com → New Project → Import repo
3. Add environment variables in the dashboard
4. Deploy → get your URL

## Environment Variables

| Variable | Where to get it |
|---|---|
| `VITE_ANTHROPIC_API_KEY` | console.anthropic.com |
| `VITE_APP_ID` | Output of `python scripts/deploy.py` |
| `VITE_APP_ADDRESS` | Output of `python scripts/deploy.py` |
| `VITE_ALGOD_TOKEN` | Use `"a" * 64` for AlgoNode free tier |
| `VITE_ALGOD_SERVER` | `https://testnet-api.algonode.cloud` |

## Full Flow

```
User types "Find me Sony headphones"
      ↓
Claude API searches + compares prices → renders product cards
      ↓
User clicks "Buy with ALGO"
      ↓
Pera Wallet opens → user approves signature
      ↓
Atomic tx group sent to Algorand Testnet:
  [0] App call  → create_escrow(order_id)
  [1] Payment   → locks ALGO in smart contract
      ↓
Tx confirmed → escrow status shown in chat
      ↓
Agent calls confirm_delivery() → funds released to merchant
```

## Project Structure

```
src/
  lib/
    algorand.js   ← All Algorand: wallet, contract calls, state reads
    agent.js      ← Claude API: product search system prompt + call
  hooks/
    useWallet.js  ← React hook: wallet state, balance, opt-in
  components/
    WalletBar.jsx    ← Header with wallet connect button
    ProductCard.jsx  ← Product card with "Buy with ALGO" button
    ChatMessage.jsx  ← Chat bubble + product grid renderer
  App.jsx           ← Main chat UI + message orchestration
```
