"use client";

import { PermitDetermination } from "@/lib/types";
import AgencyBadge from "./AgencyBadge";

const PRIORITY_STYLES: Record<string, { dot: string; text: string }> = {
  critical: { dot: "bg-red-400", text: "text-red-400" },
  high: { dot: "bg-amber-400", text: "text-amber-400" },
  medium: { dot: "bg-blue-400", text: "text-blue-400" },
  low: { dot: "bg-slate-400", text: "text-slate-400" },
};

export default function PermitCard({
  permit,
  agencyCode,
}: {
  permit: PermitDetermination;
  agencyCode: string;
}) {
  const priority = PRIORITY_STYLES[permit.priority] || PRIORITY_STYLES.medium;

  if (!permit.required) return null;

  return (
    <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-semibold text-white leading-snug">{permit.permit_name}</h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${priority.dot}`} />
          <span className={`text-xs font-mono uppercase ${priority.text}`}>{permit.priority}</span>
        </div>
      </div>

      <div className="mb-3">
        <AgencyBadge code={agencyCode} />
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-3">{permit.reason}</p>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-slate-600 block">Timeline</span>
          <span className="text-slate-300 font-mono">{permit.timeline_weeks} weeks</span>
        </div>
        <div>
          <span className="text-slate-600 block">Confidence</span>
          <span
            className={`font-mono ${
              permit.confidence === "high"
                ? "text-emerald-400"
                : permit.confidence === "medium"
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            {permit.confidence}
          </span>
        </div>
        {permit.estimated_cost && (
          <div>
            <span className="text-slate-600 block">Est. Cost</span>
            <span className="text-slate-300 font-mono">{permit.estimated_cost}</span>
          </div>
        )}
      </div>

      {permit.forms && permit.forms.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-600 block mb-1">Required Forms</span>
          <div className="flex flex-wrap gap-1">
            {permit.forms.map((form, i) => (
              <span
                key={i}
                className="inline-block bg-slate-800/50 text-slate-400 text-xs px-1.5 py-0.5 rounded font-mono"
              >
                {form}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
