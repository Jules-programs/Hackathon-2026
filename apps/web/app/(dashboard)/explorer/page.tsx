"use client";

import { useEffect, useMemo, useState } from "react";
import { coverageStream, signatures } from "@/lib/mock-data";
import { fileTransactionClaim } from "@/lib/mcp-client";
import { getWalletState, signMessage } from "@/lib/wallet";

export default function ExplorerPage() {
  const [stream, setStream] = useState(coverageStream);
  const [txHash, setTxHash] = useState("0x");
  const [evidenceUri, setEvidenceUri] = useState("https://example.com/evidence");
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [auditSignature, setAuditSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStream((prev) => {
        const next = [
          {
            txHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
            premium: `${(Math.random() * 500 + 20).toFixed(2)} USDT`,
            expiresIn: `${Math.floor(Math.random() * 120 + 5)}m`
          },
          ...prev
        ];
        return next.slice(0, 8);
      });
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, []);

  const highValueClaimThreshold = useMemo(() => "$50M", []);

  async function submitClaim() {
    setError(null);
    setClaimStatus("Submitting claim...");
    try {
      const wallet = await getWalletState();
      if (!wallet.account) {
        throw new Error("Connect wallet first from top-right header");
      }

      const result = await fileTransactionClaim({
        txHash,
        evidenceUri,
        reporterWallet: wallet.account
      });

      setClaimStatus(`Claim ${result.claimId} queued with ${result.reviewWindowHours}h review window`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim submission failed");
      setClaimStatus(null);
    }
  }

  async function approveClaim() {
    setError(null);
    try {
      const wallet = await getWalletState();
      if (!wallet.account) {
        throw new Error("Connect wallet first from top-right header");
      }

      const signature = await signMessage(wallet.account, `Novae Rog Safe Approval: ${txHash || "pending-claim"}`);
      setAuditSignature(signature);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit approval signing failed");
    }
  }

  return (
    <main className="space-y-6">
      <section className="glass p-5">
        <h2 className="text-xl font-semibold">Live Coverage Stream</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-300">
              <tr>
                <th className="pb-2">Tx Hash</th>
                <th className="pb-2">Premium</th>
                <th className="pb-2">Coverage Remaining</th>
              </tr>
            </thead>
            <tbody>
              {stream.map((item) => (
                <tr key={item.txHash} className="border-t border-line/60">
                  <td className="py-2 font-mono">{item.txHash}</td>
                  <td className="py-2">{item.premium}</td>
                  <td className="py-2">{item.expiresIn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-grid">
        <article className="glass p-5">
          <h3 className="text-lg font-semibold">On-Chain Signature Proofs</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {signatures.map((sig) => (
              <li key={sig.agent} className="rounded-md border border-line p-3">
                <p className="font-medium text-mint">{sig.agent}</p>
                <p className="font-mono text-xs text-slate-300">{sig.sig}</p>
                <p className="text-xs text-slate-400">Validated block: {sig.block}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="glass p-5">
          <h3 className="text-lg font-semibold">Audit Multi-Sig Panel</h3>
          <p className="mt-2 text-sm text-slate-300">Claims above {highValueClaimThreshold} require signer review with AI verification logs and explorer proofs.</p>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <input value={txHash} onChange={(event) => setTxHash(event.target.value)} placeholder="Claim transaction hash" />
            <input value={evidenceUri} onChange={(event) => setEvidenceUri(event.target.value)} placeholder="Evidence URI" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void submitClaim()} className="rounded-md border border-line px-4 py-2 text-sm hover:border-mint hover:text-mint">
              File Transaction Claim
            </button>
            <button type="button" onClick={() => void approveClaim()} className="rounded-md border border-line px-4 py-2 text-sm hover:border-mint hover:text-mint">
              Approve Claim via Safe
            </button>
          </div>
          {claimStatus ? <p className="mt-3 text-sm text-mint">{claimStatus}</p> : null}
          {auditSignature ? <p className="mt-2 break-all text-xs text-slate-300">Safe signer signature: {auditSignature}</p> : null}
          {error ? <p className="mt-2 text-sm text-signal">{error}</p> : null}
        </article>
      </section>
    </main>
  );
}
