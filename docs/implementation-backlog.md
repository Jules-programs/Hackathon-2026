# Novae Rog Implementation Backlog (MVP)

## Sprint 1 - Foundations

- [x] Monorepo bootstrap (web, mcp-server, shared)
- [x] Shared schemas for MCP tools + EIP-712 quote payload
- [x] Semantic registry endpoint (`/agentic-services.json`)
- [x] OpenAPI draft for core agent endpoints
- [x] Injected wallet integration and signing (MetaMask/Rabby via EIP-1193)
- [ ] Real on-chain data via indexer/event stream

## Sprint 2 - Human UI Critical Path

- [x] LP Portal shell with TVL/APY/bounty/reserve modules
- [x] Merchant Console shell with trust/premium/collateral/grace modules
- [x] Coverage Explorer shell with signature proofs and audit panel
- [x] Air-Gap Visualizer shell with data overlays
- [x] State management and loading/error states for key actions
- [x] Tx workflows and signing actions (quote/purchase/claim/audit)

## Sprint 3 - Machine Interface Hardening

- [x] MCP-style tool routes for quote/purchase/claim
- [ ] Standard MCP protocol transport implementation
- [ ] API keys, rate limits, and abuse controls
- [ ] Nonce/replay and signature verification controls

## Sprint 4 - Demo and QA

- [ ] End-to-end scripted demo runbook
- [ ] Reliability fallback mode and cached replay data
- [ ] Full type and smoke test coverage
