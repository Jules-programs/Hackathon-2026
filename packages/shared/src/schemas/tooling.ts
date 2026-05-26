import { z } from "zod";

export const quoteRequestSchema = z.object({
  targetContract: z.string().min(2),
  coveredAmount: z.number().positive(),
  token: z.enum(["USDC", "USDT", "WBTC", "BTC"]),
  chain: z.enum(["base", "goat", "solana"])
});

export const quoteResponseSchema = z.object({
  quoteId: z.string(),
  premiumBps: z.number().int().nonnegative(),
  premiumAmount: z.number().nonnegative(),
  expiresAt: z.string(),
  reservationRatio: z.number().min(0).max(1)
});

export const purchaseCoverSchema = z.object({
  quoteId: z.string(),
  paymentTxHash: z.string(),
  buyerWallet: z.string()
});

export const fileClaimSchema = z.object({
  txHash: z.string(),
  evidenceUri: z.string().url().optional(),
  reporterWallet: z.string()
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
export type PurchaseCoverRequest = z.infer<typeof purchaseCoverSchema>;
export type FileClaimRequest = z.infer<typeof fileClaimSchema>;
