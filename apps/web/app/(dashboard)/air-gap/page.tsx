"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { forestCouncil } from "@/lib/mock-data";

export default function AirGapPage() {
  const [blockHeight, setBlockHeight] = useState(18873530);
  const [nodes, setNodes] = useState(forestCouncil);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setBlockHeight((prev) => prev + 1);
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          trustScore: Math.max(80, Math.min(99, node.trustScore + (Math.random() > 0.5 ? 1 : -1))),
          latencyMs: Math.max(40, Math.round(node.latencyMs + (Math.random() * 20 - 10))),
          clusterSize: Math.max(12, node.clusterSize + (Math.random() > 0.5 ? 1 : -1)),
          lastHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`
        }))
      );
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main className="space-y-6">
      <section className="glass p-5">
        <h2 className="text-xl font-semibold">Real-Time Air-Gap Pipeline</h2>
        <p className="mt-2 text-sm text-slate-300">
          Visual nodes are synced with hard data overlays including trust score, cluster size, latency, block references, and cryptographic hashes.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-amber">Current Block Height: {blockHeight}</p>
      </section>

      <section className="panel-grid">
        {nodes.map((node, index) => (
          <motion.article
            key={node.code}
            className="glass node-glow p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-mint">{node.code}</p>
            <h3 className="text-lg font-semibold">{node.role}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <p className="text-slate-300">Trust Score</p>
              <p className="text-right text-mint">{node.trustScore}/100</p>
              <p className="text-slate-300">Latency</p>
              <p className="text-right">{node.latencyMs} ms</p>
              <p className="text-slate-300">Cluster Size</p>
              <p className="text-right">{node.clusterSize}</p>
              <p className="text-slate-300">Last Proof Hash</p>
              <p className="text-right font-mono text-xs">{node.lastHash}</p>
            </div>
          </motion.article>
        ))}
      </section>
    </main>
  );
}
