"use client";

interface ClassificationData {
  sic_code?: string;
  sic_description?: string;
  land_use_type?: string;
  estimated_disturbance_acres?: number;
  near_school?: boolean;
  near_waterway?: boolean;
  involves_hazmat?: boolean;
  location_type?: string;
  waterway_name?: string | null;
  school_distance_ft?: number | null;
  project_summary?: string;
  key_operations?: string[];
  emissions_profile?: {
    likely_air_pollutants?: string[];
    likely_tacs?: string[];
    wastewater_types?: string[];
    has_fog?: boolean;
  };
}

export default function ClassificationBanner({
  classification,
}: {
  classification: ClassificationData | null;
}) {
  if (!classification) return null;

  const flags = [
    { label: "Hazmat", active: classification.involves_hazmat, color: "red" },
    { label: "Near Waterway", active: classification.near_waterway, color: "blue" },
    { label: "Near School", active: classification.near_school, color: "amber" },
  ];

  return (
    <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4">
      <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
        Project Classification
      </h3>

      {classification.project_summary && (
        <p className="text-sm text-slate-300 mb-3">{classification.project_summary}</p>
      )}

      {classification.key_operations && classification.key_operations.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {classification.key_operations.map((op, i) => (
            <span key={i} className="px-2 py-0.5 text-xs font-mono bg-slate-800/50 text-slate-400 rounded">
              {op}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-slate-600 text-xs block">SIC Code</span>
          <span className="text-white font-mono font-bold">
            {classification.sic_code || "N/A"}
          </span>
        </div>
        <div>
          <span className="text-slate-600 text-xs block">Industry</span>
          <span className="text-slate-300 text-xs">
            {classification.sic_description || "N/A"}
          </span>
        </div>
        <div>
          <span className="text-slate-600 text-xs block">Land Use</span>
          <span className="text-slate-300 text-xs">
            {classification.land_use_type || "N/A"}
          </span>
        </div>
        <div>
          <span className="text-slate-600 text-xs block">Disturbance</span>
          <span className="text-slate-300 font-mono text-xs">
            {classification.estimated_disturbance_acres != null
              ? `${classification.estimated_disturbance_acres} acres`
              : "N/A"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
        {flags.map((flag) => (
          <span
            key={flag.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono ${
              flag.active
                ? flag.color === "red"
                  ? "bg-red-950/40 text-red-400 border border-red-800/50"
                  : flag.color === "blue"
                  ? "bg-blue-950/40 text-blue-400 border border-blue-800/50"
                  : "bg-amber-950/40 text-amber-400 border border-amber-800/50"
                : "bg-slate-800/30 text-slate-600 border border-slate-800"
            }`}
          >
            <span>{flag.active ? "\u2713" : "\u2717"}</span>
            {flag.label}
          </span>
        ))}
        {classification.waterway_name && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-cyan-950/30 text-cyan-400 border border-cyan-800/50">
            {classification.waterway_name}
          </span>
        )}
        {classification.school_distance_ft != null && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-amber-950/30 text-amber-400 border border-amber-800/50">
            School: {classification.school_distance_ft}ft
          </span>
        )}
      </div>

      {classification.emissions_profile && (
        (classification.emissions_profile.likely_air_pollutants?.length ?? 0) > 0 ||
        (classification.emissions_profile.likely_tacs?.length ?? 0) > 0
      ) && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <span className="text-slate-600 text-xs block mb-1">Emissions Profile</span>
          <div className="flex flex-wrap gap-1">
            {classification.emissions_profile.likely_air_pollutants?.map((p, i) => (
              <span key={`ap-${i}`} className="px-1.5 py-0.5 text-xs font-mono bg-orange-950/30 text-orange-400 rounded">
                {p}
              </span>
            ))}
            {classification.emissions_profile.likely_tacs?.map((t, i) => (
              <span key={`tac-${i}`} className="px-1.5 py-0.5 text-xs font-mono bg-red-950/30 text-red-400 rounded">
                TAC: {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
