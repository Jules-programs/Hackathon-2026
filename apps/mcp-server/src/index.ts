import { createHash } from "node:crypto";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { recoverMessageAddress } from "viem";
import {
  fileClaimSchema,
  policyStatusRequestSchema,
  policyStatusResponseSchema,
  purchaseCoverSchema,
  quoteRequestSchema,
  quoteResponseSchema,
  setRpcOutageSchema,
  settlementPathRequestSchema,
  settlementPathResponseSchema
} from "@novae-rog/shared/schemas";
import { store, type PolicyRecord, type QuoteRecord } from "./store.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json());

const apiKeys = (process.env.MCP_API_KEYS ?? "")
  .split(",")
  .map((key) => key.trim())
  .filter((key) => key.length > 0);

app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use((req, res, next) => {
  if (req.path === "/health") {
    return next();
  }
  if (apiKeys.length === 0) {
    return next();
  }

  const provided = req.header("x-api-key");
  if (!provided || !apiKeys.includes(provided)) {
    return res.status(401).json({ error: { message: "Missing or invalid x-api-key" } });
  }

  return next();
});

type Chain = "base" | "goat" | "solana";
type SettlementPath = "instant_t0" | "syndicate_backed_t0" | "standard_escrow_30d";

const QUOTE_TTL_MS = 5 * 60 * 1000;
const AUTO_PAYOUT_THRESHOLD_USD = 50_000_000;
const vaultState = {
  totalVaultBalanceUsd: Number(process.env.VAULT_TOTAL_BALANCE_USD ?? 42_800_000),
  reservedCoverageUsd: Number(process.env.VAULT_RESERVED_COVERAGE_USD ?? 11_400_000)
};

function hashHex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function freeCapitalUsd(): number {
  return Math.max(0, vaultState.totalVaultBalanceUsd - vaultState.reservedCoverageUsd);
}

function deriveTrustScore(seed: string): number {
  const h = hashHex(seed);
  const scoreBand = Number.parseInt(h.slice(0, 2), 16) % 41;
  return 59 + scoreBand;
}

function settlementFromTrustScore(trustScore: number): SettlementPath {
  if (trustScore >= 95) {
    return "instant_t0";
  }
  if (trustScore >= 60) {
    return "syndicate_backed_t0";
  }
  return "standard_escrow_30d";
}

function premiumMultiplierForPath(path: SettlementPath): number {
  if (path === "instant_t0") {
    return 1.0;
  }
  if (path === "syndicate_backed_t0") {
    return 1.45;
  }
  return 2.2;
}

function claimKeyFor(chainId: number, txHash: string): string {
  return createHash("sha3-256").update(`${chainId}:${txHash.toLowerCase()}`).digest("hex");
}

function buildPurchaseMessage(input: {
  quoteId: string;
  policyId: string;
  paymentTxHash: string;
  authNonce: string;
}): string {
  return [
    "NovaeRog PurchaseCover",
    `quoteId:${input.quoteId}`,
    `policyId:${input.policyId}`,
    `paymentTxHash:${input.paymentTxHash}`,
    `nonce:${input.authNonce}`
  ].join("\n");
}

function buildClaimMessage(input: {
  chainId: number;
  txHash: string;
  claimAmountUsd: number;
  policyId?: string;
  authNonce: string;
}): string {
  return [
    "NovaeRog FileClaim",
    `chainId:${input.chainId}`,
    `txHash:${input.txHash}`,
    `claimAmountUsd:${input.claimAmountUsd}`,
    `policyId:${input.policyId ?? ""}`,
    `nonce:${input.authNonce}`
  ].join("\n");
}

async function verifySignature(wallet: string, message: string, signature: string): Promise<boolean> {
  try {
    const recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
    return recovered.toLowerCase() === wallet.toLowerCase();
  } catch {
    return false;
  }
}

async function markPolicyExpiredIfNeeded(policy: PolicyRecord): Promise<PolicyRecord> {
  if (policy.status === "expired") {
    return policy;
  }
  if (policy.freezeStartedAt) {
    return policy;
  }

  if (Date.now() >= new Date(policy.expiresAt).getTime()) {
    const nextPolicy: PolicyRecord = { ...policy, status: "expired" };
    await store.updatePolicy(nextPolicy);
    return nextPolicy;
  }

  return policy;
}

const tools = [
  {
    name: "get_underwriting_quote",
    description: "Returns a premium quote for target transaction coverage",
    inputSchema: quoteRequestSchema
  },
  {
    name: "purchase_cover",
    description: "Registers active protection after premium payment",
    inputSchema: purchaseCoverSchema
  },
  {
    name: "file_transaction_claim",
    description: "Submits claim evidence against a covered transaction",
    inputSchema: fileClaimSchema
  },
  {
    name: "evaluate_settlement_path",
    description: "Evaluates merchant trust score and settlement pathway eligibility",
    inputSchema: settlementPathRequestSchema
  },
  {
    name: "get_policy_status",
    description: "Returns policy status including freeze metadata",
    inputSchema: policyStatusRequestSchema
  }
] as const;

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "novae-rog-mcp",
    persistence: store.isPersistent() ? "prisma" : "in-memory",
    apiKeyRequired: apiKeys.length > 0,
    timestamp: new Date().toISOString()
  });
});

app.get("/tools", (_req, res) => {
  res.json(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  );
});

app.post("/tools/get_underwriting_quote", async (req, res) => {
  const parsed = quoteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const freeCapital = freeCapitalUsd();
  const maxCoverage = freeCapital * 0.1;
  if (parsed.data.coveredAmount > maxCoverage) {
    return res.status(422).json({
      error: {
        message: "Coverage request exceeds 10% exposure cap of free capital",
        maxCoverage
      }
    });
  }

  const trustScore = deriveTrustScore(`${parsed.data.targetContract}:${parsed.data.chain}`);
  const settlementPath = settlementFromTrustScore(trustScore);
  const premiumMultiplier = premiumMultiplierForPath(settlementPath);

  const basePremiumBps = parsed.data.coveredAmount > 500_000 ? 120 : 50;
  const trustRiskBps = Math.max(0, 100 - trustScore);
  const premiumBps = Math.round((basePremiumBps + trustRiskBps) * premiumMultiplier);
  const gasSurcharge = Number((parsed.data.coveredAmount * 0.0008).toFixed(2));
  const premiumAmount = Number((((parsed.data.coveredAmount * premiumBps) / 10_000) + gasSurcharge).toFixed(2));

  const quoteId = `quote_${Date.now()}`;
  const policyId = `policy_${hashHex(
    `${parsed.data.targetContract}:${parsed.data.chain}:${parsed.data.token}:${parsed.data.coveredAmount}:${quoteId}`
  ).slice(0, 24)}`;
  const expiresAtMs = Date.now() + QUOTE_TTL_MS;

  const quote: QuoteRecord = {
    quoteId,
    policyId,
    targetContract: parsed.data.targetContract,
    coveredAmount: parsed.data.coveredAmount,
    token: parsed.data.token,
    chain: parsed.data.chain,
    premiumBps,
    premiumAmount,
    gasSurcharge,
    trustScore,
    settlementPath,
    expiresAtMs
  };
  await store.upsertQuote(quote);

  const response = quoteResponseSchema.parse({
    quoteId,
    policyId,
    premiumBps,
    premiumAmount,
    gasSurcharge,
    expiresAt: new Date(expiresAtMs).toISOString(),
    reservationRatio: vaultState.reservedCoverageUsd / vaultState.totalVaultBalanceUsd,
    trustScore,
    settlementPath
  });

  return res.json(response);
});

app.post("/tools/purchase_cover", async (req, res) => {
  const parsed = purchaseCoverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const purchaseMessage = buildPurchaseMessage({
    quoteId: parsed.data.quoteId,
    policyId: parsed.data.policyId,
    paymentTxHash: parsed.data.paymentTxHash,
    authNonce: parsed.data.authNonce
  });

  const validSignature = await verifySignature(parsed.data.buyerWallet, purchaseMessage, parsed.data.authSignature);
  if (!validSignature) {
    return res.status(401).json({ error: { message: "Invalid purchase signature" } });
  }

  const nonceAccepted = await store.markNonceUsed({
    actorWallet: parsed.data.buyerWallet,
    action: "purchase_cover",
    nonce: parsed.data.authNonce,
    signature: parsed.data.authSignature
  });
  if (!nonceAccepted) {
    return res.status(409).json({ error: { message: "Nonce already used" } });
  }

  const pending = await store.getQuoteById(parsed.data.quoteId);
  if (!pending) {
    return res.status(404).json({ error: { message: "Unknown quoteId" } });
  }

  if (Date.now() > pending.expiresAtMs) {
    await store.deleteQuoteById(parsed.data.quoteId);
    return res.status(410).json({ error: { message: "Quote expired" } });
  }

  if (parsed.data.policyId !== pending.policyId) {
    return res.status(409).json({ error: { message: "policyId does not match quote" } });
  }

  if (parsed.data.paymentMemoPolicyId !== pending.policyId) {
    return res.status(409).json({
      error: { message: "paymentMemoPolicyId mismatch: x402 memo must include policyId" }
    });
  }

  if (await store.hasPolicy(pending.policyId)) {
    return res.status(409).json({ error: { message: "Policy already active" } });
  }

  vaultState.reservedCoverageUsd += pending.coveredAmount;
  const activatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await store.createPolicy({
    policyId: pending.policyId,
    quoteId: pending.quoteId,
    coveredAmount: pending.coveredAmount,
    buyerWallet: parsed.data.buyerWallet,
    chain: pending.chain,
    activatedAt,
    expiresAt,
    status: "active",
    freezeStartedAt: null,
    totalFrozenMs: 0
  });
  await store.deleteQuoteById(parsed.data.quoteId);

  return res.json({
    status: "active",
    policyId: pending.policyId,
    activatedAt,
    expiresAt,
    reservedCoverageUsd: vaultState.reservedCoverageUsd,
    freeCapitalUsd: freeCapitalUsd(),
    paymentTxHash: parsed.data.paymentTxHash
  });
});

app.post("/tools/file_transaction_claim", async (req, res) => {
  const parsed = fileClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const claimMessage = buildClaimMessage({
    chainId: parsed.data.chainId,
    txHash: parsed.data.txHash,
    claimAmountUsd: parsed.data.claimAmountUsd,
    policyId: parsed.data.policyId,
    authNonce: parsed.data.authNonce
  });

  const validSignature = await verifySignature(parsed.data.reporterWallet, claimMessage, parsed.data.authSignature);
  if (!validSignature) {
    return res.status(401).json({ error: { message: "Invalid claim signature" } });
  }

  const nonceAccepted = await store.markNonceUsed({
    actorWallet: parsed.data.reporterWallet,
    action: "file_transaction_claim",
    nonce: parsed.data.authNonce,
    signature: parsed.data.authSignature
  });
  if (!nonceAccepted) {
    return res.status(409).json({ error: { message: "Nonce already used" } });
  }

  if (parsed.data.policyId) {
    const policy = await store.findPolicy(parsed.data.policyId);
    if (!policy) {
      return res.status(404).json({ error: { message: "Unknown policyId" } });
    }
  }

  const claimKey = claimKeyFor(parsed.data.chainId, parsed.data.txHash);
  if (await store.hasClaimKey(claimKey)) {
    return res.status(409).json({
      error: {
        message: "Claim already submitted for this chainId and txHash",
        claimKey
      }
    });
  }

  const isAutoPayout = parsed.data.claimAmountUsd < AUTO_PAYOUT_THRESHOLD_USD;
  const settlementStatus = isAutoPayout ? "auto_settlement_queued" : "requires_multisig_review";
  const claimId = `claim_${Date.now()}`;
  const submittedAt = new Date().toISOString();

  await store.createClaim({
    claimId,
    claimKey,
    policyId: parsed.data.policyId,
    chainId: parsed.data.chainId,
    txHash: parsed.data.txHash,
    claimAmountUsd: parsed.data.claimAmountUsd,
    reporterWallet: parsed.data.reporterWallet,
    status: settlementStatus,
    payoutMode: isAutoPayout ? "auto" : "manual_multisig",
    processedOnChain: isAutoPayout,
    submittedAt
  });

  return res.json({
    claimId,
    claimKey,
    status: settlementStatus,
    payoutMode: isAutoPayout ? "auto" : "manual_multisig",
    processedOnChain: isAutoPayout,
    reviewWindowHours: 48,
    submittedAt
  });
});

app.post("/tools/evaluate_settlement_path", (req, res) => {
  const parsed = settlementPathRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const trustScore = deriveTrustScore(`${parsed.data.merchantWallet}:${parsed.data.chain}`);
  const settlementPath = settlementFromTrustScore(trustScore);
  const response = settlementPathResponseSchema.parse({
    merchantWallet: parsed.data.merchantWallet,
    trustScore,
    settlementPath,
    premiumMultiplier: premiumMultiplierForPath(settlementPath),
    evaluatedAt: new Date().toISOString()
  });

  return res.json(response);
});

app.post("/tools/get_policy_status", async (req, res) => {
  const parsed = policyStatusRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const policy = await store.findPolicy(parsed.data.policyId);
  if (!policy) {
    return res.status(404).json({ error: { message: "Unknown policyId" } });
  }

  const normalized = await markPolicyExpiredIfNeeded(policy);
  const response = policyStatusResponseSchema.parse({
    policyId: normalized.policyId,
    status: normalized.status,
    expiresAt: normalized.expiresAt,
    freezeStartedAt: normalized.freezeStartedAt,
    totalFrozenMs: normalized.totalFrozenMs
  });

  return res.json(response);
});

app.post("/admin/set_rpc_outage", async (req, res) => {
  const parsed = setRpcOutageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const now = Date.now();
  const policies = await store.listActivePoliciesByChain(parsed.data.chain as Chain);
  let impactedPolicies = 0;

  for (const policy of policies) {
    if (parsed.data.isOutage) {
      if (policy.freezeStartedAt) {
        continue;
      }

      const nextPolicy: PolicyRecord = {
        ...policy,
        freezeStartedAt: new Date(now).toISOString()
      };
      await store.updatePolicy(nextPolicy);
      impactedPolicies += 1;
      continue;
    }

    if (!policy.freezeStartedAt) {
      continue;
    }

    const frozenMs = Math.max(0, now - new Date(policy.freezeStartedAt).getTime());
    const nextPolicy: PolicyRecord = {
      ...policy,
      freezeStartedAt: null,
      totalFrozenMs: policy.totalFrozenMs + frozenMs,
      expiresAt: new Date(new Date(policy.expiresAt).getTime() + frozenMs).toISOString()
    };
    await store.updatePolicy(nextPolicy);
    impactedPolicies += 1;
  }

  const outage = await store.setChainOutage(parsed.data.chain as Chain, parsed.data.isOutage);
  return res.json({
    status: "ok",
    outage,
    impactedPolicies,
    updatedAt: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Novae Rog MCP server listening on ${port}`);
});
