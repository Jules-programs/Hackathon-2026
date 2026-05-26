# Novae Rog Business Plan and System Requirements Specification (SRS)

Version: 1.0
Date: 2026-05-26
Status: Baseline Draft
Method: Dennis, Wixom, and Tegarden systems analysis framing

## 1. Business Plan and Market Opportunity

### 1.1 Vision
Novae Rog is an autonomous, cross-chain risk underwriting and agentic payment protocol. It combines:
- Programmatic payment clearing for AI-native transactions.
- Real-time smart contract risk underwriting.
- Cross-chain claim settlement secured by Bitcoin-aligned infrastructure (GOAT Network + BitVM2 model).

The protocol acts as an automated equivalent of:
- Payment gateway protection models (for example, chargeback-like safety paths).
- Lloyd's-style bespoke underwriting syndicates.

### 1.2 Problem Statement
The Agentic Web3 Economy has three core failure points:
- Irreversible transaction loss from exploits or failed state transitions.
- Human-in-the-loop payment friction (wallet prompts) that blocks machine-to-machine automation.
- Slow, manual, governance-heavy claim decisions in current DeFi coverage systems.

### 1.3 Revenue Model
- Underwriting premiums: Per-transaction micro-premiums collected through x402.
- Syndicate performance fees: 10% protocol fee on successful premium yield earned by LP capital pools.
- Cross-chain settlement fees: Pass-through and operational fees for messaging and payout execution overhead.

## 2. System Architecture and Technical Stack

### 2.1 High-Level Components
- Transactional client agents and merchant or dApp integrations on EVM and Solana.
- ClawUp-hosted Underwriter Agent (OpenClaw runtime) for quote generation and risk scoring.
- x402 payment rail for premium clearing and policy activation.
- Syndicate Vault on GOAT Network for pooled collateral and claim payouts.
- Cross-chain messaging layer (Chainlink CCIP or LayerZero).
- Claim guardrails for automatic versus multi-sig settlement paths.

### 2.2 Reference Technology Stack
- Agent core: OpenClaw on ClawUp managed runtime.
- Payments protocol: x402 (HTTP 402-based programmatic payment flows).
- Chain layer: GOAT Network EVM with Bitcoin-finality aligned security assumptions.
- Smart contracts: Solidity >=0.8.20 with Foundry.
- Backend and indexer: Express + TypeScript + Prisma + PostgreSQL.

## 3. Functional Requirements

### FR-1 Capital Pooling (Syndicate Vault)
- FR-1.1: Support LP deposits in BTC variants (native or wrapped forms where available) and stablecoins (USDT and USDC) into designated risk syndicates.
- FR-1.2: Track LP balances, lock-up periods, and proportional pool ownership.
- FR-1.3: Support manual LP withdrawals with lock-up cooldown enforcement.
- FR-1.4: Enforce collateral reservation controls to prevent insolvency and bank-run dynamics.
- FR-1.4.1: Compute Free Capital = Total Vault Balance - Total Reserved Coverage.
- FR-1.4.2: Revert any withdrawal that causes Free Capital < 0.
- FR-1.4.3: Keep policy-allocated capital reserved during active policy duration; release automatically on expiry if no valid claim.
- FR-1.4.4: Reject underwriting requests where requested coverage exceeds 10% of current Free Capital.

### FR-2 AI-Driven Risk Assessment and Underwriting
- FR-2.1: Provide a quote query interface for client agents and dApps by transaction payload or target contract.
- FR-2.2: Generate a Trust Score using cross-chain related wallet clustering.
- FR-2.2.1: Analyze funding-source overlap across supported chains.
- FR-2.2.2: Detect co-interaction and identity-linkage patterns across registries and behavior timing.
- FR-2.2.3: Degrade Trust Score if any clustered wallet shows exploit linkage, blacklist history, or malicious indicators on any covered chain.
- FR-2.3: Include a Premium Gas Buffer to isolate protocol treasury from cross-chain gas volatility.
- FR-2.3.1: Premium must include dynamic surcharge for message and relayer costs.
- FR-2.3.2: Gas estimation oracle updates every 10 minutes.

### FR-3 x402 Micropayment Processing
- FR-3.1: Create an order intent when a client accepts an underwriting quote.
- FR-3.2: Verify on-chain premium payment receipt through x402 before activating coverage.
- FR-3.3: Persist active coverage status, transaction hash, and covered value.
- FR-3.4: Require x402 payment memo or calldata to include unique policyId derived from approved quote parameters for deterministic clearing.

### FR-4 Claims Verification and Payout Guardrails
- FR-4.1: Accept programmatic claim requests with transaction hash.
- FR-4.2: Verify failure or exploit conditions using target-chain explorer or RPC and websocket evidence.
- FR-4.3: Auto-settle claims below 50,000,000 USD equivalent.
- FR-4.4: Route claims at or above 50,000,000 USD equivalent to 2-of-3 multi-sig authorization flow.
- FR-4.5: Implement replay and double-claim protection.
- FR-4.5.1: Maintain processedClaims mapping keyed by claim hash.
- FR-4.5.2: claimKey = keccak256(abi.encodePacked(chainId, txHash)).
- FR-4.5.3: Assert claim not processed before payout and mark processed immediately upon success path.
- FR-4.6: If target-chain RPC outage is detected, freeze affected policy expiration countdown on-chain until verification access is restored.

### FR-5 Programmatic Escrow and Retail Underwriting
- FR-5.1: Provide a programmatic escrow path for retail transactions.
- FR-5.2: Lock funds at checkout and enforce 30-day dispute window by default.
- FR-5.3: Integrate shipping and carrier status endpoints for delivery and return verification.
- FR-5.4: Auto-refund buyer when dispute or return is verified within window.
- FR-5.5: Auto-release escrow to merchant when no dispute exists at window close.
- FR-5.6: Support micro-transaction scaling.
- FR-5.6.1: Cache risk scores and quote outputs off-chain.
- FR-5.6.2: Execute on high-throughput L2 or L3 with target per-transaction gas below 0.001 USD where network conditions allow.
- FR-5.7: Enforce trust-score-based settlement pathways.
- FR-5.7.1: Trust Score >=95 enables instant payout (T+0).
- FR-5.7.2: For T+0 transactions, valid disputes are refunded from Syndicate Vault.
- FR-5.7.3: Trust Score 60 to 94 may request instant payout by paying dynamic risk premium via x402.
- FR-5.7.4: Trust Score <60 or unverified remains on standard escrow.
- FR-5.8: Enforce merchant recourse and staker protection flows.
- FR-5.8.1: Send immediate reimbursement notice with 48-hour deadline.
- FR-5.8.2: Attempt automated clawback from linked clearing wallet and pending payout streams.
- FR-5.8.3: Require Merchant Stake Vault collateral for instant-settlement eligibility; liquidate collateral after missed reimbursement deadline.
- FR-5.8.4: If debt is unresolved due to insufficient collateral, apply trust score penalty (-20), remove instant-settlement eligibility, downgrade to standard escrow, and increase future premium multipliers.

## 4. Non-Functional Requirements

### 4.1 Operational Requirements
- OR-1: Underwriter runtime must operate in ClawUp managed OpenClaw environment.
- OR-2: Contracts must run on GOAT Network EVM testnet and mainnet targets with cross-chain interoperability to EVM and Solana.
- OR-3: Client support includes desktop and mobile web3 browser environments.
- OR-4: Integrate GOAT x402 API gateway for order creation and validation.
- OR-5: Integrate cross-chain routers on supported chains for secure state and payout updates.
- OR-6: Front-end admin and LP interfaces must be responsive on desktop and mobile.
- OR-7: Contracts must be modular and upgradeable (proxy pattern support).
- OR-8: OpenClaw skills must be documented in markdown and YAML for runtime maintainability.

### 4.2 Performance Requirements
- PR-1: Quote response time <=2.5 seconds.
- PR-2: Claim verification and payout initiation for claims under 50,000,000 USD equivalent <=15 seconds after failure detection.
- PR-3: Backend supports 5,000 concurrent users or agents at peak.
- PR-4: Database supports at least 10,000 active policies without material query degradation.
- PR-5: Underwriter service availability target is 99.9% uptime.
- PR-6: Automated hourly backup to cloud object storage with RPO under 1 hour.

### 4.3 Security Requirements
- SR-1: Enforce RBAC and onlyOwner restrictions for vault-level administrative operations.
- SR-2: LP withdrawals limited to owner-specific balances only.
- SR-3: Underwriter key material must be encrypted in managed secret storage; never stored in source.
- SR-4: Cross-chain payout commands must be cryptographically signed and destination-verified.
- SR-5: Claims >=50,000,000 USD equivalent require 2-of-3 multi-sig authorization.
- SR-6: Sanitize all external payloads and calldata to reduce injection and malicious interaction risk.

### 4.4 Cultural and Regulatory Requirements
- CR-1: Support chain-specific risk parameter tuning by jurisdiction and network profile.
- CR-2: Enforce jurisdictional IP controls in user-facing dApp interfaces when required by policy.
- CR-3: Adopt licensing model that protects proprietary risk-model parameters while keeping core solidity collateral pools open source.

## 5. Assumptions and Constraints

- USD thresholds use a consistent oracle source with defined update intervals and fallback behavior.
- BTC and wrapped BTC support is implementation-dependent by deployed network capabilities.
- Exact legal compliance controls are jurisdiction-specific and require counsel review before production launch.
- Any T+0 pathway depends on reliable identity, trust-score, and merchant wallet linkage.

## 6. Traceability Starter Matrix

This section maps requirements to current repo surfaces for implementation planning.

- FR-2, FR-3 -> apps/mcp-server quote and purchase routes, packages/shared schemas.
- FR-4 -> apps/mcp-server claim route, policy state machine, and on-chain payout adapters.
- FR-5 -> apps/web merchant and explorer flows, escrow orchestration APIs, trust score controls.
- OR/PR/SR -> backend observability, rate limiting, auth, signature verification, backup jobs.

## 7. Acceptance Baseline

A requirement is considered implemented when:
- Code path exists and is test-covered at unit or integration level.
- API and schema behavior is documented in docs/openapi.yaml and packages/shared schema contracts.
- On-chain behaviors are verified by Foundry tests for success and failure conditions.
- Dashboard behavior is validated in web flows for both happy-path and guardrail-path scenarios.
