"use client";

export type WalletState = {
  account: string | null;
  chainId: string | null;
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

export async function connectWallet(): Promise<WalletState> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No injected wallet detected. Install MetaMask or Rabby.");
  }

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;

  return {
    account: accounts?.[0] ?? null,
    chainId
  };
}

export async function getWalletState(): Promise<WalletState> {
  const provider = getProvider();
  if (!provider) {
    return { account: null, chainId: null };
  }

  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;

  return {
    account: accounts?.[0] ?? null,
    chainId
  };
}

export async function signTypedData(account: string, payload: object): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No injected wallet detected");
  }

  const result = (await provider.request({
    method: "eth_signTypedData_v4",
    params: [account, JSON.stringify(payload)]
  })) as string;

  return result;
}

export async function signMessage(account: string, message: string): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No injected wallet detected");
  }

  const bytes = new TextEncoder().encode(message);
  const hexMessage = `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
  const result = (await provider.request({
    method: "personal_sign",
    params: [hexMessage, account]
  })) as string;

  return result;
}
