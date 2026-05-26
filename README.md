# Novae Rog MVP Workspace

This repository bootstraps the implementation plan for the Novae Rog front-end and agentic discovery layer.

## Workspace layout

- `apps/web`: Human interface dashboard and public explorer (Next.js)
- `apps/mcp-server`: Machine-to-machine discovery and tool execution API
- `packages/shared`: Shared schemas for MCP tools, EIP-712 payloads, and domain types
- `docs`: OpenAPI and implementation backlog
- `abi`: Deployment and ABI registry pointers

## Quick start

1. Install dependencies:
   - `npm install`
2. Configure environment:
    - Copy `apps/web/.env.example` to `apps/web/.env.local`
    - Update `NEXT_PUBLIC_MCP_BASE_URL` if your MCP service is not running on `http://localhost:8787`
2. Run the web app:
   - `npm run dev:web`
3. Run the MCP service:
   - `npm run dev:mcp`

## Functional dashboard flows

- LP Portal (`/lp`)
   - Live quote requests to MCP pricing endpoint
   - Interactive deposit and APY projection simulator
- Merchant Console (`/merchant`)
   - Collateral locker with dynamic trust/premium updates
   - 48-hour reimbursement countdown
   - No-code snippet generator
   - EIP-712 quote signing with injected wallet
   - Coverage activation via MCP purchase endpoint
- Coverage Explorer (`/explorer`)
   - Live-updating coverage stream simulation
   - Claim filing form calling MCP endpoint
   - Auditor approval signature flow
- Air-Gap Pipeline (`/air-gap`)
   - Animated Forest Council nodes with real-time data overlays

## Wallet notes

- Front-end currently supports injected wallets compatible with EIP-1193 (`window.ethereum`), including MetaMask and Rabby.
- Connect wallet from the top-right header in any dashboard route before signing or purchase actions.

## Initial routes

- `/lp`: LP Syndicate Vault Portal
- `/merchant`: Merchant Stake Vault & Developer Console
- `/explorer`: Coverage & Claims Explorer
- `/air-gap`: Air-Gap Pipeline Visualizer
- `/agentic-services.json`: Semantic discovery registry
