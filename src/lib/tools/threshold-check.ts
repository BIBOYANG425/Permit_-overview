interface ThresholdCheckInput {
  agency: "SCAQMD" | "RWQCB" | "Sanitation" | "CDFW" | "USACE" | "Fire_CUPA";
  check_type: string;
  sic_code?: string;
  disturbance_acres?: number;
  has_emissions_equipment?: boolean;
  discharges_to_sewer?: boolean;
  stores_hazmat?: boolean;
  near_waterway?: boolean;
}

interface ThresholdCheckResult {
  triggered: boolean;
  rule_or_regulation: string;
  threshold_value: string;
  project_value: string;
  permit_required: string;
  reasoning: string;
  estimated_timeline_weeks: number;
  estimated_cost: string;
  forms: string[];
}

export function thresholdCheck(input: ThresholdCheckInput): ThresholdCheckResult {
  const sicNum = input.sic_code ? parseInt(input.sic_code) : 0;

  switch (`${input.agency}:${input.check_type}`) {
    // ===== SCAQMD =====
    case "SCAQMD:air_permit":
      return {
        triggered: input.has_emissions_equipment !== false,
        rule_or_regulation: "SCAQMD Regulation XIII — Permit to Construct / Operate",
        threshold_value: "Any equipment with potential air emissions",
        project_value: input.has_emissions_equipment ? "Equipment with air emissions identified" : "No emissions equipment identified",
        permit_required: "Permit to Construct (Form 400-A) + Permit to Operate",
        reasoning: "SCAQMD requires permits for any equipment that may emit air contaminants, including boilers, generators, paint booths, ovens, soldering stations, and process equipment.",
        estimated_timeline_weeks: 12,
        estimated_cost: "$5,000 - $25,000",
        forms: ["Form 400-A (Application for Permit to Construct)", "BACT Analysis (if applicable)", "Health Risk Assessment (if TAC)"],
      };

    case "SCAQMD:fugitive_dust":
      return {
        triggered: (input.disturbance_acres || 0) > 0,
        rule_or_regulation: "SCAQMD Rule 403 — Fugitive Dust",
        threshold_value: "Any ground disturbance activity",
        project_value: `${input.disturbance_acres || 0} acres of disturbance`,
        permit_required: "Rule 403 Dust Control Plan (no permit needed, but compliance required)",
        reasoning: "Rule 403 applies to ANY earth-moving activity. If ≥50 acres, a large operation notification is required. All projects must implement dust control measures.",
        estimated_timeline_weeks: 0,
        estimated_cost: "$500 - $2,000 (dust control measures)",
        forms: ["Rule 403 Dust Control Plan", "Large Operation Notification (if ≥50 acres)"],
      };

    case "SCAQMD:toxic_air_contaminant":
      return {
        triggered: true,
        rule_or_regulation: "SCAQMD Rule 1401 — New Source Review for Toxic Air Contaminants",
        threshold_value: "Any new or modified facility emitting a listed TAC (lead, hexavalent chromium, benzene, etc.)",
        project_value: "Facility may emit toxic air contaminants",
        permit_required: "Health Risk Assessment (HRA) + Permit to Construct",
        reasoning: "Rule 1401 requires a health risk assessment for any new or modified source of toxic air contaminants. Maximum Individual Cancer Risk must not exceed 10-in-a-million (1-in-a-million if within 1,000 ft of a school under Rule 1401.1).",
        estimated_timeline_weeks: 16,
        estimated_cost: "$10,000 - $50,000 (includes HRA)",
        forms: ["Health Risk Assessment", "Form 400-A", "AB 2588 Air Toxics Hot Spots inventory (if applicable)"],
      };

    // ===== RWQCB =====
    case "RWQCB:industrial_stormwater":
      const igpSicRanges = [
        [2000, 3999], [4000, 4999], [5015, 5015], [5093, 5093],
        [4953, 4953], [5171, 5171],
      ];
      const inIGPRange = igpSicRanges.some(([min, max]) => sicNum >= min && sicNum <= max);
      return {
        triggered: inIGPRange,
        rule_or_regulation: "Industrial General Permit (IGP) — SWRCB Order 2014-0057-DWQ",
        threshold_value: "SIC code in regulated categories (2000-3999, 4000-4999, 5015, 5093, etc.)",
        project_value: `SIC ${input.sic_code} — ${inIGPRange ? "IN regulated range" : "NOT in regulated range"}`,
        permit_required: "Industrial General Permit (IGP) — Notice of Intent (NOI) via SMARTS",
        reasoning: inIGPRange
          ? "SIC code falls within IGP-regulated categories. Facility must file NOI, develop SWPPP, conduct quarterly monitoring, and submit annual reports via SMARTS."
          : "SIC code is not in IGP-regulated categories. No industrial stormwater permit required.",
        estimated_timeline_weeks: inIGPRange ? 4 : 0,
        estimated_cost: inIGPRange ? "$3,000 - $8,000/year" : "$0",
        forms: inIGPRange ? ["NOI via SMARTS", "Stormwater Pollution Prevention Plan (SWPPP)", "Monitoring Implementation Plan"] : [],
      };

    case "RWQCB:construction_stormwater":
      const acreage = input.disturbance_acres || 0;
      const triggered = acreage >= 1;
      return {
        triggered,
        rule_or_regulation: "Construction General Permit (CGP) — SWRCB Order 2022-0057-DWQ",
        threshold_value: "≥1 acre of land disturbance (or <1 acre if part of larger common plan of development)",
        project_value: `${acreage} acres of disturbance`,
        permit_required: triggered ? "Construction General Permit — NOI via SMARTS" : "No CGP required (but BMPs still recommended)",
        reasoning: triggered
          ? `Project disturbs ${acreage} acres (≥1 acre threshold). Must file NOI, prepare SWPPP, implement BMPs, and conduct inspections.`
          : `Project disturbs ${acreage} acres (<1 acre threshold). CGP not required unless part of a larger common plan of development.`,
        estimated_timeline_weeks: triggered ? 2 : 0,
        estimated_cost: triggered ? "$2,000 - $5,000" : "$0",
        forms: triggered ? ["NOI via SMARTS", "Construction SWPPP", "Rain Event Action Plan (REAP)", "NOT upon completion"] : [],
      };

    // ===== SANITATION =====
    case "Sanitation:wastewater_discharge":
      return {
        triggered: input.discharges_to_sewer !== false,
        rule_or_regulation: "LA County Sanitation Districts — Industrial Wastewater Discharge Permit (IWDP)",
        threshold_value: "Any process wastewater discharged to the sanitary sewer system",
        project_value: input.discharges_to_sewer ? "Process wastewater discharge to sewer identified" : "No process wastewater discharge identified",
        permit_required: "Industrial Wastewater Discharge Permit (IWDP)",
        reasoning: "Any facility discharging process wastewater (not just sanitary waste) to the sewer system requires an IWDP. This includes wash water, cooling water, process rinse water, and any non-domestic wastewater.",
        estimated_timeline_weeks: 8,
        estimated_cost: "$2,000 - $5,000/year",
        forms: ["IWDP Application", "Process flow diagram", "Wastewater characterization report"],
      };

    // ===== CDFW =====
    case "CDFW:streambed_alteration":
      return {
        triggered: input.near_waterway === true,
        rule_or_regulation: "California Fish & Game Code §1602 — Lake or Streambed Alteration Agreement",
        threshold_value: "Any activity that substantially diverts or obstructs the natural flow of, or substantially changes the bed, channel, or bank of any river, stream, or lake",
        project_value: input.near_waterway ? "Project is near a waterway — potential streambed impact" : "No waterway proximity identified",
        permit_required: "Section 1602 Streambed Alteration Agreement",
        reasoning: input.near_waterway
          ? "Project proximity to a waterway triggers §1602 review. Even concrete-lined channels are jurisdictional. Must submit notification to CDFW and obtain agreement before construction."
          : "No waterway identified nearby. §1602 not triggered.",
        estimated_timeline_weeks: input.near_waterway ? 12 : 0,
        estimated_cost: input.near_waterway ? "$5,000 - $15,000" : "$0",
        forms: input.near_waterway ? ["CDFW §1602 Notification Form", "Biological assessment", "Mitigation plan"] : [],
      };

    // ===== USACE =====
    case "USACE:section_404":
      return {
        triggered: input.near_waterway === true,
        rule_or_regulation: "Clean Water Act §404 — Discharge of Dredged or Fill Material",
        threshold_value: "Discharge of dredged or fill material into waters of the United States (including wetlands and concrete channels)",
        project_value: input.near_waterway ? "Project may impact waters of the US" : "No waters of the US identified",
        permit_required: input.near_waterway ? "Section 404 Permit (Nationwide or Individual)" : "Not required",
        reasoning: input.near_waterway
          ? "Project is near waters potentially under federal jurisdiction. Section 404 permit required if any fill, grading, or construction occurs within or adjacent to these waters. Concrete channels in LA County are typically jurisdictional."
          : "No waters of the US identified. Section 404 not triggered.",
        estimated_timeline_weeks: input.near_waterway ? 20 : 0,
        estimated_cost: input.near_waterway ? "$10,000 - $50,000" : "$0",
        forms: input.near_waterway ? ["USACE Permit Application (ENG Form 4345)", "Jurisdictional Delineation", "Alternatives Analysis", "Mitigation Plan"] : [],
      };

    // ===== FIRE / CUPA =====
    case "Fire_CUPA:hazmat_storage":
      return {
        triggered: input.stores_hazmat === true,
        rule_or_regulation: "CA Health & Safety Code §25500 et seq. — Hazardous Materials Business Plan (HMBP)",
        threshold_value: ">55 gallons liquid OR >500 lbs solid OR >200 cubic feet gas of any hazardous material",
        project_value: input.stores_hazmat ? "Hazardous materials storage identified" : "No hazardous materials storage identified",
        permit_required: "Hazardous Materials Business Plan (HMBP) — filed via CERS",
        reasoning: input.stores_hazmat
          ? "Facility stores hazardous materials above reporting thresholds. Must file HMBP through California Environmental Reporting System (CERS), maintain inventory, and submit to annual inspection by LA County Fire CUPA."
          : "No hazardous materials storage identified above thresholds.",
        estimated_timeline_weeks: input.stores_hazmat ? 4 : 0,
        estimated_cost: input.stores_hazmat ? "$1,000 - $3,000/year" : "$0",
        forms: input.stores_hazmat ? ["HMBP via CERS", "Hazardous Materials Inventory", "Emergency Response Plan", "Site Map"] : [],
      };

    case "Fire_CUPA:hazwaste_generator":
      return {
        triggered: input.stores_hazmat === true,
        rule_or_regulation: "RCRA / CA Health & Safety Code §25100 — Hazardous Waste Generator",
        threshold_value: "Any facility generating hazardous waste",
        project_value: "Facility likely generates hazardous waste from operations",
        permit_required: "EPA ID Number + Generator Status Determination",
        reasoning: "Facilities with hazardous materials typically generate hazardous waste. Must obtain EPA ID number, determine generator status (VSQG/SQG/LQG), and comply with storage time limits and manifesting requirements.",
        estimated_timeline_weeks: 2,
        estimated_cost: "$500 - $2,000/year",
        forms: ["EPA Form 8700-12 (Site ID)", "Hazardous Waste Determination", "Manifest records"],
      };

    default:
      return {
        triggered: false,
        rule_or_regulation: "Unknown",
        threshold_value: "N/A",
        project_value: "N/A",
        permit_required: "Unable to determine",
        reasoning: `No threshold data available for ${input.agency}:${input.check_type}`,
        estimated_timeline_weeks: 0,
        estimated_cost: "$0",
        forms: [],
      };
  }
}
