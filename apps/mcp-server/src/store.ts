import { PrismaClient } from "@prisma/client";

type Chain = "base" | "goat" | "solana";
type SettlementPath = "instant_t0" | "syndicate_backed_t0" | "standard_escrow_30d";

export type QuoteRecord = {
  quoteId: string;
  policyId: string;
  targetContract: string;
  coveredAmount: number;
  token: "USDC" | "USDT" | "WBTC" | "BTC";
  chain: Chain;
  premiumBps: number;
  premiumAmount: number;
  gasSurcharge: number;
  trustScore: number;
  settlementPath: SettlementPath;
  expiresAtMs: number;
};

export type PolicyRecord = {
  policyId: string;
  quoteId: string;
  buyerWallet: string;
  chain: Chain;
  coveredAmount: number;
  activatedAt: string;
  expiresAt: string;
  status: "active" | "expired";
  freezeStartedAt: string | null;
  totalFrozenMs: number;
};

export type ClaimRecord = {
  claimId: string;
  claimKey: string;
  policyId?: string;
  chainId: number;
  txHash: string;
  claimAmountUsd: number;
  reporterWallet: string;
  status: string;
  payoutMode: "auto" | "manual_multisig";
  processedOnChain: boolean;
  submittedAt: string;
};

export type NonceRecord = {
  actorWallet: string;
  action: "purchase_cover" | "file_transaction_claim";
  nonce: string;
  signature: string;
};

export type ChainOutageRecord = {
  chain: Chain;
  isOutage: boolean;
  startedAt: string | null;
};

const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

const memQuotes = new Map<string, QuoteRecord>();
const memPolicies = new Map<string, PolicyRecord>();
const memClaims = new Map<string, ClaimRecord>();
const memNonces = new Set<string>();
const memOutages = new Map<Chain, ChainOutageRecord>([
  ["base", { chain: "base", isOutage: false, startedAt: null }],
  ["goat", { chain: "goat", isOutage: false, startedAt: null }],
  ["solana", { chain: "solana", isOutage: false, startedAt: null }]
]);

function nonceKey(record: NonceRecord): string {
  return `${record.actorWallet.toLowerCase()}:${record.action}:${record.nonce}`;
}

export const store = {
  isPersistent(): boolean {
    return prisma !== null;
  },

  async upsertQuote(quote: QuoteRecord): Promise<void> {
    if (!prisma) {
      memQuotes.set(quote.quoteId, quote);
      return;
    }

    await prisma.quote.upsert({
      where: { quoteId: quote.quoteId },
      update: {
        policyId: quote.policyId,
        targetContract: quote.targetContract,
        coveredAmount: quote.coveredAmount,
        token: quote.token,
        chain: quote.chain,
        premiumBps: quote.premiumBps,
        premiumAmount: quote.premiumAmount,
        gasSurcharge: quote.gasSurcharge,
        trustScore: quote.trustScore,
        settlementPath: quote.settlementPath,
        expiresAt: new Date(quote.expiresAtMs)
      },
      create: {
        quoteId: quote.quoteId,
        policyId: quote.policyId,
        targetContract: quote.targetContract,
        coveredAmount: quote.coveredAmount,
        token: quote.token,
        chain: quote.chain,
        premiumBps: quote.premiumBps,
        premiumAmount: quote.premiumAmount,
        gasSurcharge: quote.gasSurcharge,
        trustScore: quote.trustScore,
        settlementPath: quote.settlementPath,
        expiresAt: new Date(quote.expiresAtMs)
      }
    });
  },

  async getQuoteById(quoteId: string): Promise<QuoteRecord | null> {
    if (!prisma) {
      return memQuotes.get(quoteId) ?? null;
    }

    const quote = await prisma.quote.findUnique({ where: { quoteId } });
    if (!quote) {
      return null;
    }

    return {
      quoteId: quote.quoteId,
      policyId: quote.policyId,
      targetContract: quote.targetContract,
      coveredAmount: quote.coveredAmount,
      token: quote.token as QuoteRecord["token"],
      chain: quote.chain as Chain,
      premiumBps: quote.premiumBps,
      premiumAmount: quote.premiumAmount,
      gasSurcharge: quote.gasSurcharge,
      trustScore: quote.trustScore,
      settlementPath: quote.settlementPath as SettlementPath,
      expiresAtMs: quote.expiresAt.getTime()
    };
  },

  async deleteQuoteById(quoteId: string): Promise<void> {
    if (!prisma) {
      memQuotes.delete(quoteId);
      return;
    }

    await prisma.quote.deleteMany({ where: { quoteId } });
  },

  async hasPolicy(policyId: string): Promise<boolean> {
    if (!prisma) {
      return memPolicies.has(policyId);
    }

    const policy = await prisma.policy.findUnique({ where: { policyId } });
    return policy !== null;
  },

  async createPolicy(policy: PolicyRecord): Promise<void> {
    if (!prisma) {
      memPolicies.set(policy.policyId, policy);
      return;
    }

    await prisma.policy.create({
      data: {
        policyId: policy.policyId,
        quoteId: policy.quoteId,
        buyerWallet: policy.buyerWallet,
        chain: policy.chain,
        coveredAmount: policy.coveredAmount,
        status: policy.status,
        activatedAt: new Date(policy.activatedAt),
        expiresAt: new Date(policy.expiresAt),
        freezeStartedAt: policy.freezeStartedAt ? new Date(policy.freezeStartedAt) : null,
        totalFrozenMs: policy.totalFrozenMs
      }
    });
  },

  async findPolicy(policyId: string): Promise<PolicyRecord | null> {
    if (!prisma) {
      return memPolicies.get(policyId) ?? null;
    }

    const policy = await prisma.policy.findUnique({ where: { policyId } });
    if (!policy) {
      return null;
    }

    return {
      policyId: policy.policyId,
      quoteId: policy.quoteId,
      buyerWallet: policy.buyerWallet,
      chain: policy.chain as Chain,
      coveredAmount: policy.coveredAmount,
      status: policy.status as PolicyRecord["status"],
      activatedAt: policy.activatedAt.toISOString(),
      expiresAt: policy.expiresAt.toISOString(),
      freezeStartedAt: policy.freezeStartedAt?.toISOString() ?? null,
      totalFrozenMs: policy.totalFrozenMs
    };
  },

  async listActivePoliciesByChain(chain: Chain): Promise<PolicyRecord[]> {
    if (!prisma) {
      return [...memPolicies.values()].filter((policy) => policy.chain === chain && policy.status === "active");
    }

    const policies = await prisma.policy.findMany({ where: { chain, status: "active" } });
    return policies.map((policy) => ({
      policyId: policy.policyId,
      quoteId: policy.quoteId,
      buyerWallet: policy.buyerWallet,
      chain: policy.chain as Chain,
      coveredAmount: policy.coveredAmount,
      status: policy.status as PolicyRecord["status"],
      activatedAt: policy.activatedAt.toISOString(),
      expiresAt: policy.expiresAt.toISOString(),
      freezeStartedAt: policy.freezeStartedAt?.toISOString() ?? null,
      totalFrozenMs: policy.totalFrozenMs
    }));
  },

  async updatePolicy(policy: PolicyRecord): Promise<void> {
    if (!prisma) {
      memPolicies.set(policy.policyId, policy);
      return;
    }

    await prisma.policy.update({
      where: { policyId: policy.policyId },
      data: {
        status: policy.status,
        expiresAt: new Date(policy.expiresAt),
        freezeStartedAt: policy.freezeStartedAt ? new Date(policy.freezeStartedAt) : null,
        totalFrozenMs: policy.totalFrozenMs
      }
    });
  },

  async hasClaimKey(claimKey: string): Promise<boolean> {
    if (!prisma) {
      return [...memClaims.values()].some((claim) => claim.claimKey === claimKey);
    }

    const claim = await prisma.claim.findUnique({ where: { claimKey } });
    return claim !== null;
  },

  async createClaim(claim: ClaimRecord): Promise<void> {
    if (!prisma) {
      memClaims.set(claim.claimId, claim);
      return;
    }

    await prisma.claim.create({
      data: {
        claimId: claim.claimId,
        claimKey: claim.claimKey,
        policyId: claim.policyId,
        chainId: claim.chainId,
        txHash: claim.txHash,
        claimAmountUsd: claim.claimAmountUsd,
        reporterWallet: claim.reporterWallet,
        status: claim.status,
        payoutMode: claim.payoutMode,
        processedOnChain: claim.processedOnChain,
        submittedAt: new Date(claim.submittedAt)
      }
    });
  },

  async markNonceUsed(record: NonceRecord): Promise<boolean> {
    if (!prisma) {
      const key = nonceKey(record);
      if (memNonces.has(key)) {
        return false;
      }
      memNonces.add(key);
      return true;
    }

    const existing = await prisma.nonceUsage.findFirst({
      where: {
        actorWallet: record.actorWallet.toLowerCase(),
        action: record.action,
        nonce: record.nonce
      }
    });

    if (existing) {
      return false;
    }

    await prisma.nonceUsage.create({
      data: {
        actorWallet: record.actorWallet.toLowerCase(),
        action: record.action,
        nonce: record.nonce,
        signature: record.signature
      }
    });

    return true;
  },

  async setChainOutage(chain: Chain, isOutage: boolean): Promise<ChainOutageRecord> {
    const startedAt = isOutage ? new Date().toISOString() : null;

    if (!prisma) {
      const record: ChainOutageRecord = { chain, isOutage, startedAt };
      memOutages.set(chain, record);
      return record;
    }

    const updated = await prisma.chainOutage.upsert({
      where: { chain },
      update: { isOutage, startedAt: isOutage ? new Date() : null },
      create: { chain, isOutage, startedAt: isOutage ? new Date() : null }
    });

    return {
      chain: updated.chain as Chain,
      isOutage: updated.isOutage,
      startedAt: updated.startedAt?.toISOString() ?? null
    };
  },

  async getChainOutage(chain: Chain): Promise<ChainOutageRecord> {
    if (!prisma) {
      return memOutages.get(chain) ?? { chain, isOutage: false, startedAt: null };
    }

    const record = await prisma.chainOutage.findUnique({ where: { chain } });
    if (!record) {
      return { chain, isOutage: false, startedAt: null };
    }

    return {
      chain: record.chain as Chain,
      isOutage: record.isOutage,
      startedAt: record.startedAt?.toISOString() ?? null
    };
  }
};
