import { z } from "zod";

export const settlementPathSchema = z.enum(["instant_t0", "syndicate_backed_t0", "standard_escrow_30d"]);
export const chainSchema = z.enum(["base", "goat", "solana"]);

const signedAuthSchema = z.object({
  authNonce: z.string().min(8),
  authSignature: z.string().regex(/^0x[0-9a-fA-F]+$/),
  authVersion: z.literal("v1").default("v1")
});

export const quoteRequestSchema = z.object({
  targetContract: z.string().min(2),
  coveredAmount: z.number().positive(),
  token: z.enum(["USDC", "USDT", "WBTC", "BTC"]),
  chain: chainSchema
});

export const quoteResponseSchema = z.object({
  quoteId: z.string(),
  policyId: z.string(),
  premiumBps: z.number().int().nonnegative(),
  premiumAmount: z.number().nonnegative(),
  gasSurcharge: z.number().nonnegative(),
  expiresAt: z.string(),
  reservationRatio: z.number().min(0).max(1),
  trustScore: z.number().int().min(0).max(100),
  settlementPath: settlementPathSchema
});

export const purchaseCoverSchema = z.object({
  quoteId: z.string(),
  policyId: z.string(),
  paymentMemoPolicyId: z.string(),
  paymentTxHash: z.string(),
  buyerWallet: z.string()
}).merge(signedAuthSchema);

export const fileClaimSchema = z.object({
  policyId: z.string().optional(),
  chainId: z.number().int().nonnegative(),
  txHash: z.string(),
  claimAmountUsd: z.number().positive(),
  evidenceUri: z.string().url().optional(),
  reporterWallet: z.string()
}).merge(signedAuthSchema);

export const settlementPathRequestSchema = z.object({
  merchantWallet: z.string().min(2),
  chain: chainSchema
});

export const settlementPathResponseSchema = z.object({
  merchantWallet: z.string(),
  trustScore: z.number().int().min(0).max(100),
  settlementPath: settlementPathSchema,
  premiumMultiplier: z.number().positive(),
  evaluatedAt: z.string()
});

export const setRpcOutageSchema = z.object({
  chain: chainSchema,
  isOutage: z.boolean()
});

export const policyStatusRequestSchema = z.object({
  policyId: z.string()
});

export const policyStatusResponseSchema = z.object({
  policyId: z.string(),
  status: z.enum(["active", "expired"]),
  expiresAt: z.string(),
  freezeStartedAt: z.string().nullable(),
  totalFrozenMs: z.number().int().nonnegative()
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
export type PurchaseCoverRequest = z.infer<typeof purchaseCoverSchema>;
export type FileClaimRequest = z.infer<typeof fileClaimSchema>;
export type SettlementPathRequest = z.infer<typeof settlementPathRequestSchema>;
export type SettlementPathResponse = z.infer<typeof settlementPathResponseSchema>;
export type SettlementPath = z.infer<typeof settlementPathSchema>;
export type SetRpcOutageRequest = z.infer<typeof setRpcOutageSchema>;
export type PolicyStatusRequest = z.infer<typeof policyStatusRequestSchema>;
export type PolicyStatusResponse = z.infer<typeof policyStatusResponseSchema>;
