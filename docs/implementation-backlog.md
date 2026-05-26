# Novae Rog Implementation Backlog (MVP)

## Sprint 1 - Foundations

- [x] Monorepo bootstrap (web, mcp-server, shared)
- [x] Shared schemas for MCP tools + EIP-712 quote payload
- [x] Semantic registry endpoint (`/agentic-services.json`)
- [x] OpenAPI draft for core agent endpoints
- [x] Injected wallet integration and signing (MetaMask/Rabby via EIP-1193)
- [ ] Real on-chain data via indexer/event stream
- [x] Prisma schema and persistence adapter scaffold (PostgreSQL + in-memory fallback)

## Sprint 2 - Human UI Critical Path

- [x] LP Portal shell with TVL/APY/bounty/reserve modules
- [x] Merchant Console shell with trust/premium/collateral/grace modules
- [x] Coverage Explorer shell with signature proofs and audit panel
- [x] Air-Gap Visualizer shell with data overlays
- [x] State management and loading/error states for key actions
- [x] Tx workflows and signing actions (quote/purchase/claim/audit)

## Sprint 3 - Machine Interface Hardening

- [x] MCP-style tool routes for quote/purchase/claim
- [x] x402 policy memo mapping enforcement (`policyId` in purchase intent)
- [x] Claim replay protection scaffold (deterministic claim key and duplicate rejection)
- [x] Trust-score settlement pathway evaluation endpoint
- [ ] Standard MCP protocol transport implementation
- [x] API keys, rate limits, and abuse controls
- [x] Nonce/replay and signature verification controls
- [x] RPC outage freeze/unfreeze administrative safeguard endpoint

## Sprint 4 - Demo and QA

- [ ] End-to-end scripted demo runbook
- [ ] Reliability fallback mode and cached replay data
- [ ] Full type and smoke test coverage
