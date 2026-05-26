import {
  FileClaimRequest,
  PurchaseCoverRequest,
  QuoteRequest,
  QuoteResponse
} from "@novae-rog/shared/schemas";

const baseUrl = process.env.NEXT_PUBLIC_MCP_BASE_URL ?? "http://localhost:8787";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getHealth() {
  const response = await fetch(`${baseUrl}/health`, { cache: "no-store" });
  return parseJson<{ ok: boolean; service: string; timestamp: string }>(response);
}

export async function getUnderwritingQuote(input: QuoteRequest): Promise<QuoteResponse> {
  const response = await fetch(`${baseUrl}/tools/get_underwriting_quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseJson<QuoteResponse>(response);
}

export async function purchaseCover(input: PurchaseCoverRequest): Promise<{ status: string; policyId: string; activatedAt: string }> {
  const response = await fetch(`${baseUrl}/tools/purchase_cover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseJson<{ status: string; policyId: string; activatedAt: string }>(response);
}

export async function fileTransactionClaim(input: FileClaimRequest): Promise<{ claimId: string; status: string; reviewWindowHours: number; submittedAt: string }> {
  const response = await fetch(`${baseUrl}/tools/file_transaction_claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseJson<{ claimId: string; status: string; reviewWindowHours: number; submittedAt: string }>(response);
}
