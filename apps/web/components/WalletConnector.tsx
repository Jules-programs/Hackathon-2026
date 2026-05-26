"use client";

import { useEffect, useState } from "react";
import { connectWallet, getWalletState } from "@/lib/wallet";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnector() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getWalletState()
      .then((state) => {
        setAccount(state.account);
        setChainId(state.chainId);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Wallet read failed"));
  }, []);

  async function onConnect() {
    setError(null);
    try {
      const state = await connectWallet();
      setAccount(state.account);
      setChainId(state.chainId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <button
        type="button"
        onClick={onConnect}
        className="rounded-full border border-line px-3 py-1.5 text-slate-100 transition hover:border-mint hover:text-mint"
      >
        {account ? `Wallet ${truncateAddress(account)}` : "Connect Wallet"}
      </button>
      <p className="text-slate-400">{chainId ? `Chain ${chainId}` : "No chain connected"}</p>
      {error ? <p className="text-signal">{error}</p> : null}
    </div>
  );
}
