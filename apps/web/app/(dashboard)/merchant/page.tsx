"use client";

import { useEffect, useState } from "react";
import { createQuoteTypedData } from "@novae-rog/shared/schemas";
import { MetricCard } from "@/components/MetricCard";
import { getUnderwritingQuote, purchaseCover } from "@/lib/mcp-client";
import { getWalletState, signTypedData } from "@/lib/wallet";

export default function MerchantPage() {
  const [collateralLocked, setCollateralLocked] = useState(180000);
  const [collateralThreshold] = useState(150000);
  const [quoteId, setQuoteId] = useState<string>("");
  const [paymentTxHash, setPaymentTxHash] = useState("0x");
  const [chain, setChain] = useState<"base" | "goat" | "solana">("base");
  const [contractAddress, setContractAddress] = useState("0x0000000000000000000000000000000000000000");
  const [coveredAmount, setCoveredAmount] = useState(5000);
  const [currency, setCurrency] = useState<"USDT" | "USDC">("USDT");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typedSig, setTypedSig] = useState<string | null>(null);
  const [graceEnd] = useState(Date.now() + 48 * 60 * 60 * 1000);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const graceRemainingMs = Math.max(0, graceEnd - now);
  const graceHours = Math.floor(graceRemainingMs / (60 * 60 * 1000));
  const graceMinutes = Math.floor((graceRemainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const trustScore = Math.max(50, Math.min(99, Math.round(70 + (collateralLocked / collateralThreshold) * 10)));
  const premiumRate = collateralLocked >= collateralThreshold ? 0.8 : 5;

  const integrationSnippet = `<NovaeRogShield\n  chain=\"${chain}\"\n  contractAddress=\"${contractAddress}\"\n  coveredAmount={${coveredAmount}}\n  currency=\"${currency}\"\n/>`;

  async function fetchQuote() {
    setError(null);
    setStatus("Fetching quote...");
    try {
      const quote = await getUnderwritingQuote({
        targetContract: contractAddress,
        coveredAmount,
        token: currency,
        chain
      });
      setQuoteId(quote.quoteId);
      setStatus(`Quote fetched: ${quote.premiumAmount} (${quote.premiumBps} bps)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get quote");
      setStatus(null);
    }
  }

  async function activateCoverage() {
    setError(null);
    setStatus("Activating coverage...");
    try {
      const wallet = await getWalletState();
      if (!wallet.account) {
        throw new Error("Connect wallet first from top-right header");
      }
      if (!quoteId) {
        throw new Error("Fetch a quote first");
      }

      const result = await purchaseCover({
        quoteId,
        paymentTxHash,
        buyerWallet: wallet.account
      });
      setStatus(`Coverage ${result.status}. Policy: ${result.policyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate coverage");
      setStatus(null);
    }
  }

  async function signQuoteAgreement() {
    setError(null);
    setStatus("Requesting EIP-712 signature...");
    try {
      const wallet = await getWalletState();
      if (!wallet.account) {
        throw new Error("Connect wallet first from top-right header");
      }

      const typedData = createQuoteTypedData({
        chainId: chain === "base" ? 8453 : chain === "goat" ? 2345 : 1,
        verifyingContract: contractAddress,
        quoteId: quoteId || "0x0000000000000000000000000000000000000000000000000000000000000000",
        merchant: wallet.account,
        token: currency,
        coveredAmount: BigInt(coveredAmount),
        premiumAmount: BigInt(Math.floor((coveredAmount * premiumRate) / 100)),
        nonce: BigInt(1),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 300)
      });

      const signature = await signTypedData(wallet.account, typedData);
      setTypedSig(signature);
      setStatus("Quote signed with EIP-712 payload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign quote");
      setStatus(null);
    }
  }

  return (
    <main className="space-y-6">
      <section className="metric-grid">
        <MetricCard label="Trust Score" value={`${trustScore}/100`} detail="Dispute profile, cluster health, and clearing consistency" />
        <MetricCard label="Dynamic Premium" value={`${premiumRate.toFixed(1)}%`} detail="Current x402 underwriting premium" tone="amber" />
        <MetricCard label="Locked Collateral" value={`$${collateralLocked.toLocaleString()}`} detail={`Safety threshold $${collateralThreshold.toLocaleString()}`} />
        <MetricCard label="Grace Window" value={`${graceHours}h ${graceMinutes}m`} detail="Time remaining before automatic liquidation" tone="signal" />
      </section>

      <section className="panel-grid">
        <article className="glass p-5">
          <h2 className="text-xl font-semibold">Stake Vault Collateral Locker</h2>
          <p className="mt-2 text-sm text-slate-300">Adjust collateral to maintain T+0 settlement eligibility and avoid reserve liquidation.</p>
          <label className="mt-3 block text-xs uppercase tracking-[0.2em] text-slate-300">Collateral Balance (USD)</label>
          <input
            type="number"
            min={0}
            value={collateralLocked}
            onChange={(event) => setCollateralLocked(Number(event.target.value || 0))}
            className="mt-1"
          />
          <div className="mt-4 rounded-md border border-signal/50 bg-signal/10 p-3 text-sm text-rose-100">
            Reimbursement event active: {graceHours}h {graceMinutes}m left before collateral liquidation trigger.
          </div>
        </article>

        <article className="glass p-5">
          <h2 className="text-xl font-semibold">No-Code Integration Wizard</h2>
          <p className="mt-2 text-sm text-slate-300">Choose chain + contract and generate the shield component snippet.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Chain</label>
              <select value={chain} onChange={(event) => setChain(event.target.value as typeof chain)} className="mt-1">
                <option>base</option>
                <option>goat</option>
                <option>solana</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Currency</label>
              <select value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)} className="mt-1">
                <option>USDT</option>
                <option>USDC</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Contract Address</label>
              <input value={contractAddress} onChange={(event) => setContractAddress(event.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Covered Amount</label>
              <input
                type="number"
                min={1}
                value={coveredAmount}
                onChange={(event) => setCoveredAmount(Number(event.target.value || 0))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Payment Tx Hash</label>
              <input value={paymentTxHash} onChange={(event) => setPaymentTxHash(event.target.value)} className="mt-1" />
            </div>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950/70 p-3 text-xs text-mint">{integrationSnippet}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void fetchQuote()} className="rounded-md border border-line px-4 py-2 text-sm hover:border-mint hover:text-mint">
              Get Premium Quote
            </button>
            <button type="button" onClick={() => void signQuoteAgreement()} className="rounded-md border border-line px-4 py-2 text-sm hover:border-mint hover:text-mint">
              Sign EIP-712 Quote
            </button>
            <button type="button" onClick={() => void activateCoverage()} className="rounded-md border border-line px-4 py-2 text-sm hover:border-mint hover:text-mint">
              Activate Coverage
            </button>
          </div>
          {status ? <p className="mt-3 text-sm text-mint">{status}</p> : null}
          {error ? <p className="mt-2 text-sm text-signal">{error}</p> : null}
          {typedSig ? <p className="mt-2 break-all text-xs text-slate-300">Signature: {typedSig}</p> : null}
        </article>
      </section>
    </main>
  );
}
