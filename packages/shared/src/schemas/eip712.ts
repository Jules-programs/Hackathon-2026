import { z } from "zod";

export const quoteTypedDataSchema = z.object({
  domain: z.object({
    name: z.literal("NovaeRogQuote"),
    version: z.literal("1"),
    chainId: z.number().int().positive(),
    verifyingContract: z.string()
  }),
  types: z.object({
    Quote: z.array(
      z.object({
        name: z.string(),
        type: z.string()
      })
    )
  }),
  primaryType: z.literal("Quote"),
  message: z.object({
    quoteId: z.string(),
    merchant: z.string(),
    token: z.string(),
    coveredAmount: z.string(),
    premiumAmount: z.string(),
    nonce: z.string(),
    deadline: z.string()
  })
});

export type QuoteTypedData = z.infer<typeof quoteTypedDataSchema>;

export function createQuoteTypedData(input: {
  chainId: number;
  verifyingContract: string;
  quoteId: string;
  merchant: string;
  token: string;
  coveredAmount: bigint;
  premiumAmount: bigint;
  nonce: bigint;
  deadline: bigint;
}): QuoteTypedData {
  return {
    domain: {
      name: "NovaeRogQuote",
      version: "1",
      chainId: input.chainId,
      verifyingContract: input.verifyingContract
    },
    types: {
      Quote: [
        { name: "quoteId", type: "bytes32" },
        { name: "merchant", type: "address" },
        { name: "token", type: "string" },
        { name: "coveredAmount", type: "uint256" },
        { name: "premiumAmount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    },
    primaryType: "Quote",
    message: {
      quoteId: input.quoteId,
      merchant: input.merchant,
      token: input.token,
      coveredAmount: input.coveredAmount.toString(),
      premiumAmount: input.premiumAmount.toString(),
      nonce: input.nonce.toString(),
      deadline: input.deadline.toString()
    }
  };
}
