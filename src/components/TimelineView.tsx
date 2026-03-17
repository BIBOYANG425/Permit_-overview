"use client";

interface SynthesisData {
  recommended_sequence?: string[];
  parallel_tracks?: string[][];
  critical_path?: string[];
  estimated_total_timeline_months?: number;
  warnings?: string[];
  cost_estimate_range?: string;
}

const TRACK_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-cyan-500",
];

export default function TimelineView({ synthesis }: { synthesis: SynthesisData | null }) {
  if (!synthesis) return null;

  return (
    <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4 space-y-4">
      <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
        Permit Filing Timeline
      </h3>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white font-mono">
            {synthesis.estimated_total_timeline_months || "?"}
          </div>
          <div className="text-xs text-slate-500">months total</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-emerald-400 font-mono">
            {synthesis.cost_estimate_range || "TBD"}
          </div>
          <div className="text-xs text-slate-500">est. cost range</div>
        </div>
      </div>

      {/* Recommended Sequence */}
      {synthesis.recommended_sequence && synthesis.recommended_sequence.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500 mb-2 font-semibold">Recommended Filing Sequence</h4>
          <div className="space-y-1.5">
            {synthesis.recommended_sequence.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center mt-0.5">
                  <span className="text-xs text-slate-400 font-mono font-bold">{i + 1}</span>
                </div>
                <span className="text-sm text-slate-300">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parallel Tracks */}
      {synthesis.parallel_tracks && synthesis.parallel_tracks.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500 mb-2 font-semibold">Parallel Tracks</h4>
          <div className="space-y-2">
            {synthesis.parallel_tracks.map((track, i) => (
              <div key={i} className="flex items-start gap-2">
                <div
                  className={`flex-shrink-0 w-1 h-full min-h-[24px] rounded-full ${TRACK_COLORS[i % TRACK_COLORS.length]}`}
                />
                <div className="flex flex-wrap gap-1">
                  {track.map((permit, j) => (
                    <span
                      key={j}
                      className="inline-block bg-slate-800/60 text-slate-300 text-xs px-2 py-1 rounded font-mono"
                    >
                      {permit}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Path */}
      {synthesis.critical_path && synthesis.critical_path.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500 mb-2 font-semibold">Critical Path</h4>
          <div className="flex items-center gap-1 flex-wrap">
            {synthesis.critical_path.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="bg-red-950/30 text-red-400 text-xs px-2 py-1 rounded border border-red-900/50 font-mono">
                  {step}
                </span>
                {i < synthesis.critical_path!.length - 1 && (
                  <span className="text-slate-600">&rarr;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {synthesis.warnings && synthesis.warnings.length > 0 && (
        <div className="space-y-1.5">
          {synthesis.warnings.map((warning, i) => (
            <div
              key={i}
              className="bg-amber-950/20 border border-amber-900/30 rounded-md px-3 py-2 text-xs text-amber-300"
            >
              <span className="font-bold mr-1">Warning:</span>
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
