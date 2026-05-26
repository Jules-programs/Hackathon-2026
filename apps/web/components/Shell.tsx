import Link from "next/link";
import { ReactNode } from "react";
import { WalletConnector } from "@/components/WalletConnector";

const navItems = [
  { href: "/lp", label: "LP Vault" },
  { href: "/merchant", label: "Merchant Console" },
  { href: "/explorer", label: "Coverage Explorer" },
  { href: "/air-gap", label: "Air-Gap Pipeline" }
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <header className="glass mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-mint">Novae Rog</p>
          <h1 className="text-2xl font-semibold">Mutual Risk Dashboard</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <nav className="flex flex-wrap justify-end gap-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-line px-3 py-1.5 text-slate-100 transition hover:border-mint hover:text-mint"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <WalletConnector />
        </div>
      </header>
      {children}
    </div>
  );
}
