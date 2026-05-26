export const lpMetrics = {
  tvl: "$42.8M",
  averageApy: "17.2%",
  liquidationYield: "2.9%",
  reservedCollateral: "$11.4M"
};

export const merchantMetrics = {
  trustScore: "92/100",
  premiumRate: "0.8%",
  collateralLocked: "$180k",
  collateralThreshold: "$150k",
  graceRemaining: "31h 21m"
};

export const coverageStream = [
  { txHash: "0x72af...8e9a", premium: "320 USDT", expiresIn: "18m" },
  { txHash: "0xf09a...41d3", premium: "88 USDC", expiresIn: "41m" },
  { txHash: "0x9981...1131", premium: "0.0021 BTC", expiresIn: "2h 03m" }
];

export const signatures = [
  { agent: "ROSA_Sig", sig: "0x8d44...af91", block: 18873499 },
  { agent: "XCPA_Sig", sig: "0x47de...bca2", block: 18873504 },
  { agent: "CVAA_Sig", sig: "0x31ba...98f1", block: 18873511 }
];

export const forestCouncil = [
  {
    code: "ROSA",
    role: "Risk Oracle",
    trustScore: 96,
    latencyMs: 118,
    clusterSize: 44,
    lastHash: "0x6d7c...210d"
  },
  {
    code: "XCPA",
    role: "Micropayments",
    trustScore: 94,
    latencyMs: 87,
    clusterSize: 39,
    lastHash: "0xbbf1...8a0e"
  },
  {
    code: "CVAA",
    role: "Arbitration",
    trustScore: 91,
    latencyMs: 142,
    clusterSize: 23,
    lastHash: "0xae34...29cb"
  },
  {
    code: "VRSA",
    role: "Vault Settlement",
    trustScore: 97,
    latencyMs: 104,
    clusterSize: 28,
    lastHash: "0x4ca2...f7d8"
  }
];
