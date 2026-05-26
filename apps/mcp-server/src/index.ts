import cors from "cors";
import express from "express";
import {
  fileClaimSchema,
  purchaseCoverSchema,
  quoteRequestSchema,
  quoteResponseSchema
} from "@novae-rog/shared/schemas";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json());

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
  }
] as const;

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "novae-rog-mcp", timestamp: new Date().toISOString() });
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

app.post("/tools/get_underwriting_quote", (req, res) => {
  const parsed = quoteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const premiumBps = parsed.data.coveredAmount > 500_000 ? 120 : 50;
  const premiumAmount = Number(((parsed.data.coveredAmount * premiumBps) / 10_000).toFixed(2));
  const response = quoteResponseSchema.parse({
    quoteId: `quote_${Date.now()}`,
    premiumBps,
    premiumAmount,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    reservationRatio: 0.32
  });

  return res.json(response);
});

app.post("/tools/purchase_cover", (req, res) => {
  const parsed = purchaseCoverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  return res.json({
    status: "active",
    policyId: `policy_${parsed.data.quoteId}`,
    activatedAt: new Date().toISOString()
  });
});

app.post("/tools/file_transaction_claim", (req, res) => {
  const parsed = fileClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  return res.json({
    claimId: `claim_${Date.now()}`,
    status: "queued",
    reviewWindowHours: 48,
    submittedAt: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Novae Rog MCP server listening on ${port}`);
});
