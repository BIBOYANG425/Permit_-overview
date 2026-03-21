import { CountyConfig, CityConfig, PermitAnalysis, AgencyAnalysis } from "../types";

// Extract classification from potentially nested structure
function getClassification(analysis: PermitAnalysis): Record<string, unknown> {
  const raw = analysis.classification as unknown as Record<string, unknown> | undefined;
  if (raw && typeof raw === "object" && "classification" in raw) {
    return (raw as { classification: Record<string, unknown> }).classification;
  }
  return raw || {};
}

// Build a concise project summary for prompts
function buildProjectSummary(analysis: PermitAnalysis, projectDescription: string, address: string): string {
  const c = getClassification(analysis);
  return `Project: ${projectDescription}
Address: ${address}
SIC: ${c.sic_code || "Unknown"} — ${c.sic_description || "Unknown"}
Land Use: ${c.land_use_type || "Unknown"}
Disturbance: ${c.estimated_disturbance_acres || 0} acres
Near School: ${c.near_school ? "Yes" : "No"}${c.school_distance_ft ? ` (${c.school_distance_ft} ft)` : ""}
Near Waterway: ${c.near_waterway ? "Yes" : "No"}${c.waterway_name ? ` (${c.waterway_name})` : ""}
Hazmat: ${c.involves_hazmat ? "Yes" : "No"}
County: ${c.county || "la"}, City: ${c.city || "Unknown"}`;
}

// ── Pass 1: Header, Background, Metadata, Path Forward ──

export function getHeaderPrompt(
  countyConfig: CountyConfig,
  cityConfig: CityConfig | undefined,
  analysis: PermitAnalysis,
  projectDescription: string,
  address: string
): string {
  const c = getClassification(analysis);
  const cityName = cityConfig?.cityName || "Unincorporated " + countyConfig.name;
  const synthesis = analysis.synthesis as unknown as Record<string, unknown> | undefined;

  return `You are an environmental compliance analyst. Generate the header, background, path_forward, and metadata for an Environmental Permit Applicability Review Memorandum.

${buildProjectSummary(analysis, projectDescription, address)}

Synthesis: ${JSON.stringify(synthesis, null, 2)}

Output ONLY a JSON object with these exact keys:
{
  "header": {
    "to": [{"name": "Facility Management", "organization": "...", "title": "..."}],
    "from": [{"name": "Environmental Compliance Team", "firm": "SoCal Permit Navigator", "title": "Senior Analyst"}],
    "subject": "Re: Environmental Permit Applicability Review — [facility description] at ${address}",
    "date": "2026-03-21",
    "confidentiality_marking": "Confidential"
  },
  "background": {
    "engagement_summary": "One paragraph describing the engagement...",
    "scope": ["Air Quality", "Stormwater", ...],
    "caveats": "Preliminary analysis paragraph...",
    "data_sources": ["Client Project Description", "Regulatory Database"]
  },
  "path_forward": "One paragraph inviting further discussion...",
  "metadata": {
    "facility": {
      "name": "...",
      "address": "${address}",
      "city": "${cityName}",
      "county": "${countyConfig.name}",
      "state": "California",
      "sic_code": "${c.sic_code || "Unknown"}",
      "sic_description": "${c.sic_description || "Unknown"}",
      "operations_description": "..."
    },
    "analysis_date": "2026-03-21",
    "data_gaps": [{"description": "...", "impacts_section": "...", "requested_from": "Client", "blocking": false}],
    "agencies_referenced": [{"name": "...", "abbreviation": "...", "jurisdiction": "..."}],
    "total_estimated_fees": "${synthesis?.cost_estimate_range || "Contact agencies"}"
  }
}

Be professional and precise. Use formal tone. No markdown, no code blocks — ONLY the JSON object.`;
}

// ── Pass 2: One media section per agency ──

export function getMediaSectionPrompt(
  agencyAnalysis: AgencyAnalysis,
  countyConfig: CountyConfig,
  projectSummary: string
): string {
  const agency = agencyAnalysis.agency;
  const agencyCode = agencyAnalysis.agency_code;
  const permits = agencyAnalysis.permits || [];

  return `You are an environmental compliance analyst writing one section of a permit applicability memo.

${projectSummary}

Agency: ${agency} (${agencyCode})
Permit Analysis Results:
${JSON.stringify(permits, null, 2)}

Reasoning:
${(agencyAnalysis.reasoning_chain || []).map(s => s.content).join("\n")}

Generate a JSON object for this single media section with these exact keys:
{
  "section_title": "${agency}",
  "regulatory_context": {
    "governing_agency": {"name": "${agency}", "abbreviation": "${agencyCode}", "jurisdiction": "${countyConfig.name}"},
    "legal_basis": "The act or code this agency implements",
    "primary_concern": "Primary regulatory trigger",
    "context_narrative": "1-2 paragraph prose explaining the regulation and how it applies to this facility"
  },
  "applicability_analysis": {
    "determination_status": "exempt|subject_to_permitting|conditional|not_applicable|insufficient_data",
    "analysis_narrative": "Full prose narrative of the applicability analysis for this agency",
    "applicable_rules": [{"agency": "...", "rule_number": "...", "description": "...", "relevance": "..."}],
    "thresholds": [{"parameter": "...", "value_metric": "...", "value_imperial": "...", "source_rule": "..."}],
    "permits_required": [{"permit_name": "...", "issuing_agency": "...", "required": "yes|no|conditional", "fee": "...", "deadline_description": "..."}]
  },
  "scope_exclusions": [{"excluded_item": "...", "reason": "..."}],
  "next_steps": [{"action": "Imperative action item", "timing": "Timeline", "status": "pending"}]
}

Rules:
- Formal tone, no contractions, third-person references ("the Facility", "the Client")
- Every determination must cite specific rules/regulations
- next_steps must have at least one action item
- Output ONLY the JSON object. No markdown, no code blocks, no explanatory text.`;
}

// ── Helpers for the route ──

export function getAgencyList(analysis: PermitAnalysis): AgencyAnalysis[] {
  return (analysis.agency_analyses || []) as AgencyAnalysis[];
}

export { buildProjectSummary as getProjectSummary };
