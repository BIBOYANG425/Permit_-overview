"use client";

const AGENCY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SCAQMD: { bg: "bg-amber-950/30", text: "text-amber-400", border: "border-amber-800/50" },
  RWQCB: { bg: "bg-blue-950/30", text: "text-blue-400", border: "border-blue-800/50" },
  Sanitation: { bg: "bg-emerald-950/30", text: "text-emerald-400", border: "border-emerald-800/50" },
  CEQA: { bg: "bg-purple-950/30", text: "text-purple-400", border: "border-purple-800/50" },
  CDFW_USACE: { bg: "bg-cyan-950/30", text: "text-cyan-400", border: "border-cyan-800/50" },
  Fire_CUPA: { bg: "bg-red-950/30", text: "text-red-400", border: "border-red-800/50" },
};

const AGENCY_LABELS: Record<string, string> = {
  SCAQMD: "South Coast AQMD",
  RWQCB: "LA RWQCB Region 4",
  Sanitation: "Sanitation Districts",
  CEQA: "CEQA Lead Agency",
  CDFW_USACE: "CDFW / USACE",
  Fire_CUPA: "Fire / CUPA",
};

export default function AgencyBadge({ code }: { code: string }) {
  const colors = AGENCY_COLORS[code] || { bg: "bg-slate-800/50", text: "text-slate-400", border: "border-slate-700" };
  const label = AGENCY_LABELS[code] || code;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {label}
    </span>
  );
}
