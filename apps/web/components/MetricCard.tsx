type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "mint" | "amber" | "signal";
};

const toneClass: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  mint: "text-mint",
  amber: "text-amber",
  signal: "text-signal"
};

export function MetricCard({ label, value, detail, tone = "mint" }: MetricCardProps) {
  return (
    <article className="glass p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass[tone]}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-300">{detail}</p>
    </article>
  );
}
