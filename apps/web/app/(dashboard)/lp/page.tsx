"use client";

import { useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { lpMetrics } from "@/lib/mock-data";
import { getUnderwritingQuote } from "@/lib/mcp-client";

export default function LpPage() {
  const [depositAmount, setDepositAmount] = useState(100000);
  const [riskMultiplier, setRiskMultiplier] = useState(1.35);
  const [coveredAmount, setCoveredAmount] = useState(5000);
  const [targetContract, setTargetContract] = useState("0x0000000000000000000000000000000000000000");
  const [token, setToken] = useState<"USDC" | "USDT" | "WBTC" | "BTC">("USDT");
  const [chain, setChain] = useState<"base" | "goat" | "solana">("base");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{
    quoteId: string;
    premiumBps: number;
    premiumAmount: number;
    expiresAt: string;
  } | null>(null);

  const utilization = 0.32;
  const projectedMonthlyYield = useMemo(() => {
    const annualized = depositAmount * ((17.2 * riskMultiplier) / 100);
    return annualized / 12;
  }, [depositAmount, riskMultiplier]);

  async function requestQuote() {
    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const result = await getUnderwritingQuote({
        targetContract,
        coveredAmount,
        token,
        chain
      });
      setQuote(result);
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "Failed to fetch quote");
    } finally {
      setIsLoadingQuote(false);
    }
  }

  return (
    <main className="space-y-6">
      <section className="metric-grid">
        <MetricCard label="Total Value Locked" value={lpMetrics.tvl} detail="WBTC, BTC, and stablecoin syndicate balance" />
        <MetricCard label="Historical APY" value={lpMetrics.averageApy} detail="30-day rolling underwriting yield" />
        <MetricCard label="Liquidation Bounty Yield" value={lpMetrics.liquidationYield} detail="Additional yield from default penalty flows" tone="amber" />
        <MetricCard label="Reserved Collateral" value={lpMetrics.reservedCollateral} detail="Capital actively committed under FR-1.4" tone="signal" />
      </section>

      <section className="panel-grid">
        <article className="glass p-5">
          <h2 className="text-xl font-semibold">Dynamic Deposit / Withdrawal</h2>
          <p className="mt-2 text-sm text-slate-300">
            Cooldown: 24h. Available liquidity adjusts in real-time against active policy reservations.
          </p>
          <label className="mt-4 block text-xs uppercase tracking-[0.2em] text-slate-300">Deposit Amount (USD)</label>
          <input
            type="number"
            min={1000}
            step={500}
            value={depositAmount}
            onChange={(event) => setDepositAmount(Number(event.target.value || 0))}
            className="mt-2"
          />
          <div className="mt-4 h-2 w-full rounded-full bg-slate-900">
            <div className="h-2 rounded-full bg-mint" style={{ width: `${Math.round((1 - utilization) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">{Math.round((1 - utilization) * 100)}% free capacity, {Math.round(utilization * 100)}% policy-locked reserve.</p>
        </article>

        <article className="glass p-5">
          <h2 className="text-xl font-semibold">Pro-Rata Yield Simulator</h2>
          <label className="mt-3 block text-xs uppercase tracking-[0.2em] text-slate-300">Risk Multiplier</label>
          <input
            type="range"
            min={0.8}
            max={2}
            step={0.05}
            value={riskMultiplier}
            onChange={(event) => setRiskMultiplier(Number(event.target.value))}
            className="mt-2"
          />
          <p className="mt-3 text-sm text-slate-300">
            Projected monthly gross yield: <span className="text-mint">${projectedMonthlyYield.toFixed(2)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Calculated from historical APY baseline and current risk posture.</p>
        </article>

        <article className="glass p-5">
          <h2 className="text-xl font-semibold">Underwriting Quote Simulator</h2>
          <p className="mt-2 text-sm text-slate-300">Call MCP pricing service to preview real premium outcomes.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Target Contract</label>
              <input value={targetContract} onChange={(event) => setTargetContract(event.target.value)} className="mt-1" />
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
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Token</label>
              <select value={token} onChange={(event) => setToken(event.target.value as typeof token)} className="mt-1">
                <option>USDT</option>
                <option>USDC</option>
                <option>WBTC</option>
                <option>BTC</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-300">Chain</label>
              <select value={chain} onChange={(event) => setChain(event.target.value as typeof chain)} className="mt-1">
                <option>base</option>
                <option>goat</option>
                <option>solana</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void requestQuote()}
            disabled={isLoadingQuote}
            className="mt-4 rounded-md border border-line px-4 py-2 text-sm hover:border-mint hover:text-mint"
          >
            {isLoadingQuote ? "Fetching quote..." : "Get Live Quote"}
          </button>
          {quoteError ? <p className="mt-3 text-sm text-signal">{quoteError}</p> : null}
          {quote ? (
            <div className="mt-3 rounded-md border border-line p-3 text-sm">
              <p className="text-slate-300">Quote ID: <span className="font-mono text-mint">{quote.quoteId}</span></p>
              <p className="text-slate-300">Premium: <span className="text-mint">{quote.premiumAmount}</span> ({quote.premiumBps} bps)</p>
              <p className="text-slate-400">Expires: {new Date(quote.expiresAt).toLocaleString()}</p>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
