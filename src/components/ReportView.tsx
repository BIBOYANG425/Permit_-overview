"use client";

import { useState } from "react";
import { PermitReport, ReportMediaSection } from "@/lib/types";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    exempt: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50",
    subject_to_permitting: "bg-red-900/40 text-red-400 border-red-800/50",
    conditional: "bg-amber-900/40 text-amber-400 border-amber-800/50",
    not_applicable: "bg-slate-800/60 text-slate-400 border-slate-700/50",
    insufficient_data: "bg-purple-900/40 text-purple-400 border-purple-800/50",
  };
  const labels: Record<string, string> = {
    exempt: "Exempt",
    subject_to_permitting: "Permit Required",
    conditional: "Conditional",
    not_applicable: "N/A",
    insufficient_data: "Data Needed",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${colors[status] || colors.conditional}`}>
      {labels[status] || status}
    </span>
  );
}

function MediaSectionCard({ section, index }: { section: ReportMediaSection; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const det = section.applicability_analysis?.determination_status || "conditional";

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 bg-[#0F1117] hover:bg-slate-800/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 font-mono w-6">{index + 1}.</span>
          <span className="text-sm font-semibold text-slate-200">{section.section_title}</span>
          <StatusBadge status={det} />
        </div>
        <span className="text-slate-500 text-xs">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="px-4 py-4 space-y-4 border-t border-slate-800/60">
          {/* Regulatory Context */}
          {section.regulatory_context && (
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Regulatory Context</h4>
              <div className="text-xs text-slate-400 space-y-1">
                <p><span className="text-slate-500">Agency:</span> {section.regulatory_context.governing_agency?.name} ({section.regulatory_context.governing_agency?.abbreviation})</p>
                {section.regulatory_context.governing_agency?.jurisdiction && (
                  <p><span className="text-slate-500">Jurisdiction:</span> {section.regulatory_context.governing_agency.jurisdiction}</p>
                )}
                <p><span className="text-slate-500">Legal Basis:</span> {section.regulatory_context.legal_basis}</p>
                <p><span className="text-slate-500">Primary Concern:</span> {section.regulatory_context.primary_concern}</p>
              </div>
              {section.regulatory_context.context_narrative && (
                <p className="text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                  {section.regulatory_context.context_narrative}
                </p>
              )}
            </div>
          )}

          {/* Analysis */}
          {section.applicability_analysis && (
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Applicability Analysis</h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {section.applicability_analysis.analysis_narrative}
              </p>

              {/* Compliance Paths */}
              {section.applicability_analysis.compliance_paths && section.applicability_analysis.compliance_paths.length > 0 && (
                <div className="mt-3 space-y-2">
                  {section.applicability_analysis.compliance_paths.map((path, i) => (
                    <div key={i} className="bg-[#080A0F] border border-slate-800/60 rounded-md p-3">
                      <div className="text-xs font-semibold text-slate-300 mb-1">{path.path_label}</div>
                      <div className="text-xs text-slate-500 mb-1">Condition: {path.condition}</div>
                      <p className="text-xs text-slate-400 whitespace-pre-wrap">{path.analysis}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Permits Required */}
              {section.applicability_analysis.permits_required && section.applicability_analysis.permits_required.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs text-slate-500 font-semibold mb-1">Permits Required</h5>
                  <div className="space-y-1">
                    {section.applicability_analysis.permits_required.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${
                          p.required === "yes" ? "bg-red-400" :
                          p.required === "conditional" ? "bg-amber-400" :
                          p.required === "recommended" ? "bg-blue-400" : "bg-slate-500"
                        }`} />
                        <span className="text-slate-300">{p.permit_name}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-500">{p.issuing_agency}</span>
                        {p.fee && <span className="text-slate-500 font-mono">{p.fee}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tables */}
              {section.applicability_analysis.tables && section.applicability_analysis.tables.length > 0 && (
                <div className="mt-3 space-y-2">
                  {section.applicability_analysis.tables.map((table, i) => (
                    <div key={i}>
                      <p className="text-xs text-slate-500 font-semibold mb-1">{table.caption}</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr>
                              {table.columns.map((col, ci) => (
                                <th key={ci} className="text-left px-2 py-1 border-b border-slate-700 text-slate-400 font-semibold">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, ri) => (
                              <tr key={ri}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-2 py-1 border-b border-slate-800/40 text-slate-300">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scope Exclusions */}
          {section.scope_exclusions && section.scope_exclusions.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Scope Exclusions</h4>
              <div className="space-y-1">
                {section.scope_exclusions.map((ex, i) => (
                  <div key={i} className="text-xs text-slate-400">
                    <span className="text-slate-500">{ex.excluded_item}:</span> {ex.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {section.next_steps && section.next_steps.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Next Steps</h4>
              <ol className="space-y-2">
                {section.next_steps.map((step, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-slate-600 font-mono flex-shrink-0">{i + 1}.</span>
                    <div>
                      <span>{step.action}</span>
                      {step.timing && <span className="text-slate-500 ml-1">({step.timing})</span>}
                      {step.status && step.status !== "pending" && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-mono ${
                          step.status === "complete" ? "bg-emerald-900/40 text-emerald-400" :
                          step.status === "in_progress" ? "bg-blue-900/40 text-blue-400" :
                          "bg-red-900/40 text-red-400"
                        }`}>
                          {step.status}
                        </span>
                      )}
                      {step.sub_actions && step.sub_actions.length > 0 && (
                        <ul className="mt-1 ml-4 space-y-1">
                          {step.sub_actions.map((sub, si) => (
                            <li key={si} className="text-slate-400">
                              - {sub.action} {sub.timing && <span className="text-slate-500">({sub.timing})</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Footnotes */}
          {section.footnotes && section.footnotes.length > 0 && (
            <div className="border-t border-slate-800/40 pt-2">
              {section.footnotes.map((fn, i) => (
                <p key={i} className="text-xs text-slate-500">
                  <sup>{fn.marker}</sup> {fn.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportView({ report, onClose }: { report: PermitReport; onClose: () => void }) {
  const [expandAll, setExpandAll] = useState(false);

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permit-report-${report.metadata?.analysis_date || "draft"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Report Header */}
      <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-lg">&#9783;</span>
            <h2 className="text-sm font-bold text-white">Environmental Permit Applicability Review</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-md font-mono transition-colors"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded-md transition-colors"
            >
              &#10005;
            </button>
          </div>
        </div>

        {/* Header Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500">To:</span>
            <div className="text-slate-300 mt-0.5">
              {report.header?.to?.map((r, i) => (
                <div key={i}>{r.name}{r.title ? `, ${r.title}` : ""} — {r.organization}</div>
              )) || "Client"}
            </div>
          </div>
          <div>
            <span className="text-slate-500">From:</span>
            <div className="text-slate-300 mt-0.5">
              {report.header?.from?.map((a, i) => (
                <div key={i}>{a.name}{a.title ? `, ${a.title}` : ""} — {a.firm}</div>
              )) || "SoCal Permit Navigator"}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Re:</span>
            <span className="text-slate-300 ml-1">{report.header?.subject || "Environmental Permit Review"}</span>
          </div>
          <div>
            <span className="text-slate-500">Date:</span>
            <span className="text-slate-300 ml-1 font-mono">{report.header?.date || "—"}</span>
          </div>
        </div>
        {report.header?.confidentiality_marking && (
          <div className="mt-2 text-xs text-amber-500/70 font-mono">{report.header.confidentiality_marking}</div>
        )}
      </div>

      {/* Background */}
      {report.background && (
        <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Background</h3>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap mb-3">
            {report.background.engagement_summary}
          </p>
          {report.background.scope && report.background.scope.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {report.background.scope.map((s, i) => (
                <span key={i} className="text-xs bg-slate-800/60 text-slate-400 px-2 py-0.5 rounded font-mono">{s}</span>
              ))}
            </div>
          )}
          {report.background.caveats && (
            <p className="text-xs text-slate-500 italic mt-2">{report.background.caveats}</p>
          )}
        </div>
      )}

      {/* Media Sections */}
      {report.media_sections && report.media_sections.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Regulatory Analysis ({report.media_sections.length} sections)
            </h3>
            <button
              type="button"
              onClick={() => setExpandAll(!expandAll)}
              className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors"
            >
              {expandAll ? "Collapse All" : "Expand All"}
            </button>
          </div>
          <div className="space-y-2">
            {report.media_sections.map((section, i) => (
              <MediaSectionCard key={i} section={section} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Data Gaps */}
      {report.metadata?.data_gaps && report.metadata.data_gaps.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4">
          <h3 className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-2">
            Data Gaps ({report.metadata.data_gaps.length})
          </h3>
          <div className="space-y-2">
            {report.metadata.data_gaps.map((gap, i) => (
              <div key={i} className="text-xs text-amber-300/80 flex gap-2">
                <span className="text-amber-500/60 flex-shrink-0">&#9888;</span>
                <div>
                  <span>{gap.description}</span>
                  <span className="text-amber-500/50 ml-1">(affects: {gap.impacts_section})</span>
                  {gap.blocking && <span className="ml-1 text-red-400 font-mono">[BLOCKING]</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Path Forward */}
      {report.path_forward && (
        <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Path Forward</h3>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{report.path_forward}</p>
        </div>
      )}

      {/* Metadata Footer */}
      {report.metadata && (
        <div className="text-xs text-slate-600 flex flex-wrap gap-4 px-1">
          {report.metadata.facility?.sic_code && (
            <span>SIC: {report.metadata.facility.sic_code}</span>
          )}
          {report.metadata.total_estimated_fees && (
            <span>Est. Fees: {report.metadata.total_estimated_fees}</span>
          )}
          {report.metadata.agencies_referenced && (
            <span>{report.metadata.agencies_referenced.length} agencies referenced</span>
          )}
        </div>
      )}
    </div>
  );
}
