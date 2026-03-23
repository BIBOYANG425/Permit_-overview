interface DetermineTriggersInput {
  sic_code: string;
  is_manufacturing: boolean;
  is_construction: boolean;
  has_air_emissions: boolean;
  has_tac?: boolean;
  has_process_wastewater?: boolean;
  has_heavy_metals_in_water?: boolean;
  has_fog?: boolean;
  has_hazardous_waste?: boolean;
  stores_hazmat: boolean;
  near_waterway: boolean;
  near_school?: boolean;
  disturbance_acres?: number;
  is_new_construction: boolean;
  requires_discretionary_approval?: boolean;
  is_303d_watershed?: boolean;
  county?: string;
}

interface AgencyTrigger {
  triggered: boolean;
  reasons: string[];
  priority: "critical" | "important" | "recommended" | "not_applicable";
}

interface DetermineTriggersResult {
  air_district: AgencyTrigger;
  rwqcb: AgencyTrigger;
  sanitation_districts: AgencyTrigger;
  ceqa: AgencyTrigger;
  cdfw_usace: AgencyTrigger;
  fire_cupa: AgencyTrigger;
  summary: {
    total_agencies_triggered: number;
    highest_priority_agency: string;
    estimated_complexity: "low" | "medium" | "high" | "very_high";
  };
}

export function determineTriggers(input: DetermineTriggersInput): DetermineTriggersResult {
  const sicNum = parseInt(input.sic_code);
  const inManufacturingRange = sicNum >= 2000 && sicNum <= 3999;
  const inTransportRange = sicNum >= 4000 && sicNum <= 4999;
  const isRecycling = input.sic_code === "5015" || input.sic_code === "5093";
  const igpRegulated = inManufacturingRange || inTransportRange || isRecycling || input.sic_code === "4953" || input.sic_code === "5171";

  // Air District
  const airTriggered = input.has_air_emissions || input.is_construction || inManufacturingRange;
  const airReasons: string[] = [];
  if (input.has_air_emissions) airReasons.push("Facility has equipment with air emissions — Permit to Construct/Operate required");
  if (input.has_tac) airReasons.push("Toxic Air Contaminant emissions — Rule 1401 new source review required");
  if (input.near_school) airReasons.push("Within 1,000 ft of school — Rule 1401.1 stricter TAC limits apply");
  if (input.is_construction) airReasons.push("Ground disturbance — Rule 403 fugitive dust control required");
  const airDistrict: AgencyTrigger = {
    triggered: airTriggered,
    reasons: airReasons,
    priority: input.has_tac ? "critical" : airTriggered ? "important" : "not_applicable",
  };

  // RWQCB
  const rwqcbTriggered = igpRegulated || (input.is_construction && (input.disturbance_acres || 0) >= 1) || input.near_waterway;
  const rwqcbReasons: string[] = [];
  if (igpRegulated) rwqcbReasons.push(`SIC ${input.sic_code} is in IGP regulated category — SWPPP + SMARTS enrollment required`);
  if (input.is_construction && (input.disturbance_acres || 0) >= 1) rwqcbReasons.push(`Construction disturbing ${input.disturbance_acres}+ acres — Construction General Permit required`);
  if (input.is_303d_watershed) rwqcbReasons.push("Site drains to 303(d) impaired waterbody — Numeric Action Level monitoring required");
  if (input.near_waterway) rwqcbReasons.push("Near waterway — potential Section 401 Water Quality Certification");
  const rwqcb: AgencyTrigger = {
    triggered: rwqcbTriggered,
    reasons: rwqcbReasons,
    priority: input.is_303d_watershed ? "critical" : rwqcbTriggered ? "important" : "not_applicable",
  };

  // Sanitation Districts
  const sanitationTriggered = input.has_process_wastewater === true || input.has_fog === true;
  const sanitationReasons: string[] = [];
  if (input.has_process_wastewater) sanitationReasons.push("Process wastewater discharge to sewer — Industrial Wastewater Discharge Permit required");
  if (input.has_heavy_metals_in_water) sanitationReasons.push("Heavy metals in wastewater — EPA categorical pretreatment standards apply");
  if (input.has_fog) sanitationReasons.push("FOG in wastewater — Grease interceptor required");
  const sanitationDistricts: AgencyTrigger = {
    triggered: sanitationTriggered,
    reasons: sanitationReasons,
    priority: input.has_heavy_metals_in_water ? "critical" : sanitationTriggered ? "important" : "not_applicable",
  };

  // CEQA
  const ceqaTriggered = input.is_new_construction || input.requires_discretionary_approval === true;
  const ceqaReasons: string[] = [];
  if (input.is_new_construction) ceqaReasons.push("New construction — CEQA review required (check for categorical exemption)");
  if (input.requires_discretionary_approval) ceqaReasons.push("Requires discretionary approval — CEQA environmental review required");
  if (!ceqaTriggered) ceqaReasons.push("May be ministerial (building permit only) — likely CEQA exempt");
  const ceqa: AgencyTrigger = {
    triggered: ceqaTriggered,
    reasons: ceqaReasons,
    priority: ceqaTriggered ? "important" : "recommended",
  };

  // CDFW / USACE
  const cdfwTriggered = input.near_waterway;
  const cdfwReasons: string[] = [];
  if (input.near_waterway) {
    cdfwReasons.push("Near waterway — potential Section 404 (USACE) and Section 1602 Streambed Alteration Agreement (CDFW)");
    cdfwReasons.push("Even concrete-lined channels in LA County are jurisdictional");
  }
  const cdfwUsace: AgencyTrigger = {
    triggered: cdfwTriggered,
    reasons: cdfwReasons,
    priority: cdfwTriggered ? "important" : "not_applicable",
  };

  // Fire / CUPA
  const cupaTriggered = input.stores_hazmat || input.has_hazardous_waste === true;
  const cupaReasons: string[] = [];
  if (input.stores_hazmat) cupaReasons.push("Stores hazardous materials — HMBP required if >55 gal liquid / >500 lb solid / >200 cf gas");
  if (input.has_hazardous_waste) cupaReasons.push("Generates hazardous waste — EPA ID number + manifesting required (DTSC oversight)");
  const fireCupa: AgencyTrigger = {
    triggered: cupaTriggered,
    reasons: cupaReasons,
    priority: input.has_hazardous_waste ? "critical" : cupaTriggered ? "important" : "not_applicable",
  };

  // Summary
  const agencies = [airDistrict, rwqcb, sanitationDistricts, ceqa, cdfwUsace, fireCupa];
  const agencyNames = ["air_district", "rwqcb", "sanitation_districts", "ceqa", "cdfw_usace", "fire_cupa"];
  const triggeredCount = agencies.filter(a => a.triggered).length;

  let highestPriority = "";
  const priorityOrder = ["critical", "important", "recommended", "not_applicable"];
  for (const p of priorityOrder) {
    const idx = agencies.findIndex(a => a.priority === p && a.triggered);
    if (idx !== -1) {
      highestPriority = agencyNames[idx];
      break;
    }
  }

  const complexity: "low" | "medium" | "high" | "very_high" =
    triggeredCount <= 2 ? "low" : triggeredCount <= 4 ? "medium" : triggeredCount <= 5 ? "high" : "very_high";

  return {
    air_district: airDistrict,
    rwqcb,
    sanitation_districts: sanitationDistricts,
    ceqa,
    cdfw_usace: cdfwUsace,
    fire_cupa: fireCupa,
    summary: {
      total_agencies_triggered: triggeredCount,
      highest_priority_agency: highestPriority,
      estimated_complexity: complexity,
    },
  };
}
