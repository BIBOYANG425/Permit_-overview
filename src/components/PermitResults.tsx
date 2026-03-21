"use client";

import { PermitAnalysis, AgencyAnalysis, PermitDetermination } from "@/lib/types";
import ClassificationBanner from "./ClassificationBanner";
import PermitCard from "./PermitCard";
import TimelineView from "./TimelineView";

const AGENCY_COLORS: Record<string, string> = {
  SCAQMD: "#E8A838",
  RWQCB: "#3B82F6",
  "RWQCB-4": "#3B82F6",
  Sanitation: "#10B981",
  CEQA: "#A855F7",
  CDFW_USACE: "#06B6D4",
  Fire_CUPA: "#EF4444",
  VCAPCD: "#F59E0B",
  "RWQCB-3": "#2563EB",
  VC_EH: "#059669",
  VC_EH_CUPA: "#DC2626",
  Building: "#8B5CF6",
  Planning: "#EC4899",
  Fire: "#F97316",
  PublicWorks: "#14B8A6",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClassification(data: PermitAnalysis): any {
  const c = data.classification;
  if (!c) return null;
  if (typeof c === "object" && "classification" in c) {
    return (c as any).classification;
  }
  return c;
}

function getAllPermits(data: PermitAnalysis): { permit: PermitDetermination; agencyCode: string }[] {
  const results: { permit: PermitDetermination; agencyCode: string }[] = [];
  const analyses = data.agency_analyses || [];
  for (const analysis of analyses) {
    const a = analysis as AgencyAnalysis;
    if (a.permits) {
      for (const permit of a.permits) {
        if (permit.required) {
          results.push({ permit, agencyCode: a.agency_code || "Unknown" });
        }
      }
    }
  }
  return results;
}

// Parse cost string like "$5,000 - $25,000" into [min, max]
function parseCostRange(cost: string): [number, number] {
  const nums = cost.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return [0, 0];
  const values = nums.map((n) => parseInt(n.replace(/,/g, "")));
  return [values[0] || 0, values[values.length - 1] || values[0] || 0];
}

// SVG bar chart for cost breakdown
function CostBreakdownChart({ permits }: { permits: { permit: PermitDetermination; agencyCode: string }[] }) {
  const items = permits
    .filter((p) => p.permit.estimated_cost && p.permit.estimated_cost !== "$0")
    .map((p) => {
      const [min, max] = parseCostRange(p.permit.estimated_cost);
      return { name: p.permit.permit_name.slice(0, 30), min, max, agency: p.agencyCode };
    })
    .sort((a, b) => b.max - a.max)
    .slice(0, 6);

  if (items.length === 0) return null;

  const maxVal = Math.max(...items.map((i) => i.max));
  const totalMin = items.reduce((s, i) => s + i.min, 0);
  const totalMax = items.reduce((s, i) => s + i.max, 0);
  const barHeight = 28;
  const gap = 8;
  const svgHeight = items.length * (barHeight + gap) + 40;

  return (
    <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          Cost Breakdown Estimate
        </h3>
        <div className="text-right">
          <div className="text-sm font-bold text-white font-mono">
            ${totalMin.toLocaleString()} - ${totalMax.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">total estimated range</div>
        </div>
      </div>

      <svg width="100%" height={svgHeight} viewBox={`0 0 500 ${svgHeight}`} className="overflow-visible">
        {items.map((item, i) => {
          const y = i * (barHeight + gap);
          const minW = maxVal > 0 ? (item.min / maxVal) * 350 : 0;
          const maxW = maxVal > 0 ? (item.max / maxVal) * 350 : 0;
          const color = AGENCY_COLORS[item.agency] || "#94A3B8";
          return (
            <g key={i}>
              <text x="0" y={y + 12} fill="#94A3B8" fontSize="10" fontFamily="monospace">
                {item.name}
              </text>
              {/* Max bar (lighter) */}
              <rect x="0" y={y + 16} width={maxW} height={10} rx="2" fill={color} opacity="0.25" />
              {/* Min bar (solid) */}
              <rect x="0" y={y + 16} width={minW} height={10} rx="2" fill={color} opacity="0.7" />
              {/* Label */}
              <text x={maxW + 6} y={y + 25} fill="#CBD5E1" fontSize="10" fontFamily="monospace">
                ${item.min.toLocaleString()} - ${item.max.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(0, ${items.length * (barHeight + gap) + 10})`}>
          <rect x="0" y="0" width="12" height="8" rx="1" fill="#94A3B8" opacity="0.7" />
          <text x="16" y="8" fill="#64748B" fontSize="9" fontFamily="monospace">Low estimate</text>
          <rect x="120" y="0" width="12" height="8" rx="1" fill="#94A3B8" opacity="0.25" />
          <text x="136" y="8" fill="#64748B" fontSize="9" fontFamily="monospace">High estimate</text>
        </g>
      </svg>
    </div>
  );
}

// Timeline Gantt chart
function GanttChart({ permits }: { permits: { permit: PermitDetermination; agencyCode: string }[] }) {
  const items = permits
    .filter((p) => p.permit.timeline_weeks > 0)
    .sort((a, b) => b.permit.timeline_weeks - a.permit.timeline_weeks)
    .slice(0, 8);

  if (items.length === 0) return null;

  const maxWeeks = Math.max(...items.map((i) => i.permit.timeline_weeks));
  const barHeight = 24;
  const gap = 6;
  const svgHeight = items.length * (barHeight + gap) + 30;

  const priorityColors: Record<string, string> = {
    critical: "#EF4444",
    high: "#E8A838",
    medium: "#3B82F6",
    low: "#94A3B8",
  };

  return (
    <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4">
      <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
        Timeline (weeks)
      </h3>

      <svg width="100%" height={svgHeight} viewBox={`0 0 500 ${svgHeight}`} className="overflow-visible">
        {/* Week markers */}
        {Array.from({ length: Math.ceil(maxWeeks / 4) + 1 }, (_, i) => i * 4).map((week) => {
          const x = maxWeeks > 0 ? (week / maxWeeks) * 360 : 0;
          return (
            <g key={week}>
              <line x1={x + 120} y1="0" x2={x + 120} y2={svgHeight - 20} stroke="#1E293B" strokeWidth="1" />
              <text x={x + 120} y={svgHeight - 8} fill="#475569" fontSize="9" textAnchor="middle" fontFamily="monospace">
                {week}w
              </text>
            </g>
          );
        })}

        {items.map((item, i) => {
          const y = i * (barHeight + gap);
          const w = maxWeeks > 0 ? (item.permit.timeline_weeks / maxWeeks) * 360 : 0;
          const color = priorityColors[item.permit.priority] || "#94A3B8";
          return (
            <g key={i}>
              <text x="0" y={y + 16} fill="#94A3B8" fontSize="10" fontFamily="monospace">
                {item.permit.permit_name.slice(0, 18)}
              </text>
              <rect x="120" y={y + 4} width={w} height={16} rx="3" fill={color} opacity="0.5" />
              <text x={120 + w + 4} y={y + 16} fill="#CBD5E1" fontSize="10" fontFamily="monospace">
                {item.permit.timeline_weeks}w
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Agency distribution donut
function AgencyDonut({ permits }: { permits: { permit: PermitDetermination; agencyCode: string }[] }) {
  const agencyCounts: Record<string, number> = {};
  for (const p of permits) {
    agencyCounts[p.agencyCode] = (agencyCounts[p.agencyCode] || 0) + 1;
  }

  const entries = Object.entries(agencyCounts);
  const total = permits.length;
  let currentAngle = 0;

  return (
    <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4 flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {entries.map(([agency, count], i) => {
          const angle = (count / total) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;
          const startRad = (startAngle - 90) * (Math.PI / 180);
          const endRad = (startAngle + angle - 90) * (Math.PI / 180);
          const largeArc = angle > 180 ? 1 : 0;
          const x1 = 40 + 30 * Math.cos(startRad);
          const y1 = 40 + 30 * Math.sin(startRad);
          const x2 = 40 + 30 * Math.cos(endRad);
          const y2 = 40 + 30 * Math.sin(endRad);
          const color = AGENCY_COLORS[agency] || ["#94A3B8", "#64748B", "#475569"][i % 3];

          if (entries.length === 1) {
            return <circle key={agency} cx="40" cy="40" r="30" fill="none" stroke={color} strokeWidth="12" />;
          }

          return (
            <path
              key={agency}
              d={`M 40 40 L ${x1} ${y1} A 30 30 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={color}
              opacity="0.7"
              stroke="#0F1117"
              strokeWidth="1"
            />
          );
        })}
        <circle cx="40" cy="40" r="18" fill="#0F1117" />
        <text x="40" y="43" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="monospace">
          {total}
        </text>
      </svg>
      <div className="space-y-1">
        {entries.map(([agency, count], i) => {
          const color = AGENCY_COLORS[agency] || ["#94A3B8", "#64748B", "#475569"][i % 3];
          return (
          <div key={agency} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-slate-400 font-mono">{agency}</span>
            <span className="text-xs text-slate-500">{count} permit{count > 1 ? "s" : ""}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PermitResults({ data }: { data: PermitAnalysis | null }) {
  if (!data) return null;

  const classification = getClassification(data);
  const permits = getAllPermits(data);
  const requiredCount = permits.length;
  const agencyCount = new Set(permits.map((p) => p.agencyCode)).size;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synthesis: any = (data as any).synthesis ?? null;

  return (
    <div className="space-y-4">
      <ClassificationBanner classification={classification} />

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white font-mono">{requiredCount}</div>
          <div className="text-xs text-slate-500">permits required</div>
        </div>
        <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white font-mono">{agencyCount}</div>
          <div className="text-xs text-slate-500">agencies</div>
        </div>
        <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white font-mono">
            {synthesis?.estimated_total_timeline_months || "?"}
          </div>
          <div className="text-xs text-slate-500">months est.</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AgencyDonut permits={permits} />
        <GanttChart permits={permits} />
      </div>

      <CostBreakdownChart permits={permits} />

      {/* Timeline */}
      <TimelineView synthesis={synthesis} />

      {/* Permit Cards */}
      {permits.length > 0 && (
        <div>
          <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
            Required Permits ({requiredCount})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permits.map(({ permit, agencyCode }, i) => (
              <PermitCard key={i} permit={permit} agencyCode={agencyCode} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {synthesis?.warnings?.length > 0 && (
        <div>
          <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Warnings & Risks</h3>
          <div className="space-y-2">
            {synthesis.warnings.map((warning: string, i: number) => (
              <div key={i} className="bg-amber-950/20 border border-amber-900/30 rounded-md px-3 py-2 text-sm text-amber-300">
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
