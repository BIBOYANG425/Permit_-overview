import { CountyConfig, CityConfig, PermitAnalysisInstructionSet, LocationContext, ProjectScale, AgencyInstruction, RuleToEvaluate } from "../types";
import { thresholdCheck } from "./threshold-check";
import { ceqaExemptionCheck } from "./ceqa-exemption-check";
import { fireReviewCheck } from "./fire-review-check";
import { cityPermitCheck } from "./city-permit-check";

// ── Ventura County city-specific wastewater agency lookup ──

function getVenturaWastewaterAgency(city: string): string {
  const cityLower = city.toLowerCase();
  if (cityLower.includes("oxnard")) return "City of Oxnard Wastewater Division";
  if (cityLower.includes("ventura") || cityLower.includes("ojai")) return "Ventura Regional Sanitation District (VRSD)";
  if (cityLower.includes("camarillo") || cityLower.includes("somis")) return "Camrosa Water District";
  if (cityLower.includes("simi valley") || cityLower.includes("moorpark")) return "Ventura County Waterworks District No. 8";
  return "Ventura County Environmental Health";
}

// ── Main assembler ──

export function preComputeToolResults(
  classification: Record<string, unknown>,
  countyConfig: CountyConfig,
  cityConfig: CityConfig,
): PermitAnalysisInstructionSet & { _raw_thresholds: Record<string, unknown> } {
  const c = (classification as { classification?: Record<string, unknown> })?.classification || classification;

  // ── Extract classification fields ──
  const sicCode = (c.sic_code as string) || "9999";
  const sicDescription = (c.sic_description as string) || "";
  const acres = (c.estimated_disturbance_acres as number) || 0;
  const nearWaterway = (c.near_waterway as boolean) || false;
  const involvesHazmat = (c.involves_hazmat as boolean) || false;
  const nearSchool = (c.near_school as boolean) || false;
  const schoolDistanceFt = (c.school_distance_ft as number) ?? null;
  const waterwayName = (c.waterway_name as string) ?? null;
  const locationType = (c.location_type as string) || "Urbanized";
  const buildingSqft = (c.building_sqft as number) ?? (c.buildingSizeSqft as number) ?? null;
  const stories = (c.stories as number) ?? null;
  const occupancyType = (c.occupancy_type as string) || (c.occupancyType as string) || null;
  const isNewConstruction = (c.is_new_construction as boolean) ?? (c.isNewConstruction as boolean) ?? null;
  const projectSummary = (c.project_summary as string) || "";
  const keyOperations = (c.key_operations as string[]) || [];
  const emissionsProfile = (c.emissions_profile as { likely_air_pollutants?: string[]; likely_tacs?: string[]; wastewater_types?: string[]; has_fog?: boolean }) || {};
  const cityName = (c.city as string) || cityConfig.cityName || "";

  // ── Agency codes ──
  const airAgency = countyConfig.airDistrict.code;
  const waterAgency = countyConfig.waterBoard.code;
  const wastewaterAgency = countyConfig.wastewater.code;
  const fireAgency = countyConfig.fireCupa.code;

  // ── Run all threshold checks (unchanged logic) ──
  const airPermit = thresholdCheck({ agency: airAgency, check_type: "air_permit", sic_code: sicCode, has_emissions_equipment: true, countyConfig });
  const dust = thresholdCheck({ agency: airAgency, check_type: "fugitive_dust", disturbance_acres: acres, countyConfig });
  const tac = thresholdCheck({ agency: airAgency, check_type: "toxic_air_contaminant", sic_code: sicCode, countyConfig });
  const igp = thresholdCheck({ agency: waterAgency, check_type: "industrial_stormwater", sic_code: sicCode, countyConfig });
  const cgp = thresholdCheck({ agency: waterAgency, check_type: "construction_stormwater", disturbance_acres: acres, countyConfig });
  const sanitation = thresholdCheck({ agency: wastewaterAgency, check_type: "wastewater_discharge", sic_code: sicCode, discharges_to_sewer: true, countyConfig });
  const cdfw = thresholdCheck({ agency: "CDFW", check_type: "streambed_alteration", near_waterway: nearWaterway, countyConfig });
  const usace = thresholdCheck({ agency: "USACE", check_type: "section_404", near_waterway: nearWaterway, countyConfig });
  const fireHazmat = thresholdCheck({ agency: fireAgency, check_type: "hazmat_storage", stores_hazmat: involvesHazmat, countyConfig });
  const fireHazwaste = thresholdCheck({ agency: fireAgency, check_type: "hazwaste_generator", stores_hazmat: involvesHazmat, countyConfig });

  const ceqa = ceqaExemptionCheck({
    project_type: sicDescription,
    square_footage: buildingSqft ?? undefined,
    is_new_construction: isNewConstruction ?? true,
    in_urbanized_area: locationType.toLowerCase() !== "rural",
    near_sensitive_environment: nearWaterway,
  });

  const cityPermits = cityPermitCheck({
    projectType: sicDescription,
    buildingSizeSqft: buildingSqft,
    isNewConstruction,
    cityConfig,
  });

  const fireReview = fireReviewCheck({
    projectType: sicDescription,
    buildingSizeSqft: buildingSqft,
    stories,
    occupancyType,
    isNewConstruction,
    cityConfig,
  });

  // ── Build LocationContext ──
  const matchedWaterbody = nearWaterway && waterwayName
    ? countyConfig.waterbodies.find(wb => wb.keywords.some(kw => waterwayName.toLowerCase().includes(kw)))
    : null;

  const locationContext: LocationContext = {
    county: countyConfig.id,
    county_name: countyConfig.name,
    air_district: countyConfig.airDistrict.name,
    air_district_code: countyConfig.airDistrict.code,
    water_board: countyConfig.waterBoard.name,
    water_board_code: countyConfig.waterBoard.code,
    watershed: matchedWaterbody ? matchedWaterbody.drainage_area[0] || null : null,
    nearest_303d_waterbody: matchedWaterbody ? matchedWaterbody.name : null,
    waterbody_impairments: matchedWaterbody ? matchedWaterbody.impairments : [],
    is_303d_watershed: matchedWaterbody?.tmdl ?? false,
    near_school_1000ft: nearSchool,
    school_distance_ft: schoolDistanceFt,
    near_waterway_50ft: nearWaterway,
    in_coastal_zone: false,
  };

  // ── Build ProjectScale ──
  const scale: ProjectScale = {
    facility_sqft: buildingSqft,
    land_disturbance_acres: acres,
    is_new_construction: isNewConstruction,
    is_renovation: isNewConstruction === false,
    stories,
    occupancy_type: occupancyType,
  };

  // ── Build Agency Instructions ──
  const isVentura = countyConfig.id === "ventura";
  const airDistrictName = countyConfig.airDistrict.name;
  const agencyInstructions: AgencyInstruction[] = [];

  // 1. Air District
  const airRules: RuleToEvaluate[] = [
    {
      rule_id: `${airAgency}:air_permit`,
      rule_name: `${countyConfig.airDistrict.rules.nsr} — New Source Review`,
      applies: airPermit.triggered,
      reason: airPermit.project_value,
      key_threshold: airPermit.threshold_value,
    },
    {
      rule_id: `${airAgency}:fugitive_dust`,
      rule_name: `${countyConfig.airDistrict.rules.dust} — Fugitive Dust`,
      applies: dust.triggered,
      reason: dust.project_value,
      key_threshold: dust.threshold_value,
    },
    {
      rule_id: `${airAgency}:toxic_air_contaminant`,
      rule_name: `${countyConfig.airDistrict.rules.tac} — Toxic Air Contaminants`,
      applies: tac.triggered,
      reason: tac.project_value,
      key_threshold: tac.threshold_value,
    },
  ];

  const airTriggered = airPermit.triggered || dust.triggered || tac.triggered;
  const airInstructions = isVentura
    ? `This is a VENTURA COUNTY facility — use VCAPCD rules, NOT SCAQMD rules. Evaluate Authority to Construct (ATC) requirements under ${countyConfig.airDistrict.rules.nsr}. Dust control is under ${countyConfig.airDistrict.rules.dust} (not Rule 403). TAC review is under ${countyConfig.airDistrict.rules.tac} (not Rule 1401).`
    : `This is an LA COUNTY facility under SCAQMD jurisdiction. Evaluate Permit to Construct requirements under ${countyConfig.airDistrict.rules.nsr}. Dust control: ${countyConfig.airDistrict.rules.dust}. TAC review: ${countyConfig.airDistrict.rules.tac}.`;

  const airExpectedPermits: string[] = [];
  if (airPermit.triggered) airExpectedPermits.push(airPermit.permit_required);
  if (dust.triggered) airExpectedPermits.push(dust.permit_required);
  if (tac.triggered) airExpectedPermits.push(tac.permit_required);

  agencyInstructions.push({
    agency_id: "air_district",
    agency_name: airDistrictName,
    triggered: airTriggered,
    priority: airTriggered ? "critical" : "not_applicable",
    analysis_instructions: airInstructions,
    rules_to_evaluate: airRules,
    expected_permits: airExpectedPermits,
    key_questions: [
      `What equipment or processes will emit air contaminants?`,
      `Does the project require BACT (Best Available Control Technology) analysis?`,
      nearSchool ? `Project is within 1,000 ft of a school — does the stricter 1-in-a-million cancer risk threshold apply?` : `Is the project near any sensitive receptors?`,
      ...(emissionsProfile.likely_tacs?.length ? [`TACs identified: ${emissionsProfile.likely_tacs.join(", ")} — is a Health Risk Assessment required?`] : []),
    ],
  });

  // 2. Water Board (RWQCB)
  const waterTriggered = igp.triggered || cgp.triggered;
  const waterRules: RuleToEvaluate[] = [
    {
      rule_id: "RWQCB:industrial_stormwater",
      rule_name: "Industrial General Permit (IGP)",
      applies: igp.triggered,
      reason: igp.project_value,
      key_threshold: igp.threshold_value,
    },
    {
      rule_id: "RWQCB:construction_stormwater",
      rule_name: "Construction General Permit (CGP)",
      applies: cgp.triggered,
      reason: cgp.project_value,
      key_threshold: cgp.threshold_value,
    },
  ];

  let waterInstructions = `Water quality oversight by ${countyConfig.waterBoard.name} (Region ${countyConfig.waterBoard.region}).`;
  if (matchedWaterbody) {
    waterInstructions += ` Nearest impaired waterbody: ${matchedWaterbody.name} (303(d) listed, impairments: ${matchedWaterbody.impairments.join(", ")}). TMDL requirements may apply.`;
  }

  const waterExpectedPermits: string[] = [];
  if (igp.triggered) waterExpectedPermits.push(igp.permit_required);
  if (cgp.triggered) waterExpectedPermits.push(cgp.permit_required);

  agencyInstructions.push({
    agency_id: "water_board",
    agency_name: countyConfig.waterBoard.name,
    triggered: waterTriggered,
    priority: waterTriggered ? "important" : "not_applicable",
    analysis_instructions: waterInstructions,
    rules_to_evaluate: waterRules,
    expected_permits: waterExpectedPermits,
    key_questions: [
      igp.triggered ? "SIC code is in a regulated IGP category — has the facility filed an NOI via SMARTS?" : "Is the SIC code in a regulated IGP category?",
      cgp.triggered ? `Project disturbs ${acres} acres — SWPPP and NOI required.` : "Does the project disturb ≥1 acre?",
      matchedWaterbody ? `Project is near ${matchedWaterbody.name} — are there additional TMDL-based effluent limits?` : "Are there any nearby 303(d) impaired waterbodies?",
    ],
  });

  // 3. Wastewater
  const wwName = isVentura && cityName
    ? getVenturaWastewaterAgency(cityName)
    : countyConfig.wastewater.name;

  const wwInstructions = isVentura
    ? `Ventura County wastewater is managed by city-specific agencies. For ${cityName || "this location"}, the responsible agency is ${wwName}. Evaluate Industrial Wastewater Discharge Permit (IWDP) requirements.`
    : `Wastewater discharge oversight by ${wwName}. Evaluate IWDP requirements for any process wastewater (non-domestic) discharged to sewer.`;

  agencyInstructions.push({
    agency_id: "wastewater",
    agency_name: wwName,
    triggered: sanitation.triggered,
    priority: sanitation.triggered ? "important" : "not_applicable",
    analysis_instructions: wwInstructions,
    rules_to_evaluate: [{
      rule_id: `${wastewaterAgency}:wastewater_discharge`,
      rule_name: "Industrial Wastewater Discharge Permit",
      applies: sanitation.triggered,
      reason: sanitation.project_value,
      key_threshold: sanitation.threshold_value,
    }],
    expected_permits: sanitation.triggered ? [sanitation.permit_required] : [],
    key_questions: [
      "Does the facility discharge process wastewater (not just sanitary) to the sewer?",
      ...(emissionsProfile.wastewater_types?.length
        ? [`Identified wastewater types: ${emissionsProfile.wastewater_types.join(", ")} — do any require pretreatment?`]
        : []),
      emissionsProfile.has_fog ? "Facility has Fats/Oils/Grease (FOG) — is a grease interceptor required?" : "",
    ].filter(Boolean),
  });

  // 4. CEQA
  const ceqaTriggered = !ceqa.exempt;
  agencyInstructions.push({
    agency_id: "ceqa",
    agency_name: "CEQA Lead Agency",
    triggered: ceqaTriggered,
    priority: ceqaTriggered ? "important" : "recommended",
    analysis_instructions: ceqa.exempt
      ? `Project appears eligible for CEQA exemption: ${ceqa.exemption_name}. Confirm no exceptions apply.`
      : `Project requires CEQA review. Expected document type: ${ceqa.ceqa_document_type}. Estimated timeline: ${ceqa.estimated_timeline_weeks} weeks.`,
    rules_to_evaluate: [{
      rule_id: "CEQA:exemption_check",
      rule_name: ceqa.exempt ? (ceqa.exemption_name || "CEQA Exemption") : ceqa.ceqa_document_type,
      applies: ceqaTriggered,
      reason: ceqa.reasoning[ceqa.reasoning.length - 1] || "",
      key_threshold: ceqa.exempt ? "Categorical or ministerial exemption" : "Discretionary action with potential environmental impact",
    }],
    expected_permits: ceqaTriggered ? [`CEQA ${ceqa.ceqa_document_type}`] : [],
    key_questions: [
      ceqa.exempt ? "Confirm no CEQA exceptions (§15300.2) apply to this exemption." : "What is the appropriate CEQA document type?",
      ...(ceqa.exceptions_triggered.length ? ceqa.exceptions_triggered.map(e => `CEQA exception triggered: ${e}`) : []),
    ],
  });

  // 5. CDFW & USACE (waterway agencies)
  const waterwayTriggered = cdfw.triggered || usace.triggered;
  agencyInstructions.push({
    agency_id: "cdfw_usace",
    agency_name: "CDFW / US Army Corps of Engineers",
    triggered: waterwayTriggered,
    priority: waterwayTriggered ? "important" : "not_applicable",
    analysis_instructions: waterwayTriggered
      ? `Project is near a waterway${waterwayName ? ` (${waterwayName})` : ""}. Evaluate both CDFW §1602 Streambed Alteration Agreement and USACE §404 permit requirements. Even concrete-lined channels may be jurisdictional.`
      : "No waterway proximity identified. These agencies are likely not triggered.",
    rules_to_evaluate: [
      {
        rule_id: "CDFW:streambed_alteration",
        rule_name: "CDFW §1602 Streambed Alteration Agreement",
        applies: cdfw.triggered,
        reason: cdfw.project_value,
        key_threshold: cdfw.threshold_value,
      },
      {
        rule_id: "USACE:section_404",
        rule_name: "Clean Water Act §404",
        applies: usace.triggered,
        reason: usace.project_value,
        key_threshold: usace.threshold_value,
      },
    ],
    expected_permits: [
      ...(cdfw.triggered ? [cdfw.permit_required] : []),
      ...(usace.triggered ? [usace.permit_required] : []),
    ],
    key_questions: waterwayTriggered
      ? [
          "Will the project involve any grading, fill, or construction within or adjacent to the waterway?",
          "Is a jurisdictional delineation needed to confirm waters of the US?",
          "Are there mitigation requirements (habitat restoration, in-lieu fees)?",
        ]
      : ["Is there any waterway, drainage channel, or wetland near the project site?"],
  });

  // 6. Fire / CUPA (HazMat)
  const cupaTriggered = fireHazmat.triggered || fireHazwaste.triggered;
  agencyInstructions.push({
    agency_id: "cupa",
    agency_name: countyConfig.fireCupa.name,
    triggered: cupaTriggered,
    priority: cupaTriggered ? "important" : "not_applicable",
    analysis_instructions: cupaTriggered
      ? `Facility stores or generates hazardous materials/waste. Evaluate HMBP (via CERS), EPA ID requirements, and generator status. ${isVentura ? "CUPA is Ventura County Environmental Health (not LA County Fire)." : "CUPA is LA County Fire Department."}`
      : "No hazardous materials storage identified above reporting thresholds.",
    rules_to_evaluate: [
      {
        rule_id: `${fireAgency}:hazmat_storage`,
        rule_name: "Hazardous Materials Business Plan (HMBP)",
        applies: fireHazmat.triggered,
        reason: fireHazmat.project_value,
        key_threshold: fireHazmat.threshold_value,
      },
      {
        rule_id: `${fireAgency}:hazwaste_generator`,
        rule_name: "Hazardous Waste Generator Status",
        applies: fireHazwaste.triggered,
        reason: fireHazwaste.project_value,
        key_threshold: fireHazwaste.threshold_value,
      },
    ],
    expected_permits: [
      ...(fireHazmat.triggered ? [fireHazmat.permit_required] : []),
      ...(fireHazwaste.triggered ? [fireHazwaste.permit_required] : []),
    ],
    key_questions: cupaTriggered
      ? [
          "What hazardous materials are stored and in what quantities (>55 gal liquid, >500 lbs solid, >200 cu ft gas)?",
          "What is the generator status (VSQG/SQG/LQG)?",
          "Are there any extremely hazardous substances (EHS) triggering CalARP/RMP?",
        ]
      : ["Does the facility handle any hazardous materials or generate hazardous waste?"],
  });

  // 7. City permits (building, planning, fire, public works)
  agencyInstructions.push({
    agency_id: "city_permits",
    agency_name: `${cityConfig.cityName} Building & Planning`,
    triggered: true,
    priority: "important",
    analysis_instructions: `City-level permits for ${cityConfig.cityName}. Building permit type: ${cityPermits.buildingPermitType}. ${cityPermits.zoningClearanceRequired ? "Zoning clearance required." : ""} ${fireReview.planCheckRequired ? "Fire plan check required." : ""} ${fireReview.sprinklerRequired ? `Sprinkler system required: ${fireReview.sprinklerReason}.` : ""}`,
    rules_to_evaluate: [
      {
        rule_id: "city:building_permit",
        rule_name: `${cityConfig.cityName} Building Permit`,
        applies: cityPermits.buildingPermitRequired,
        reason: `Permit type: ${cityPermits.buildingPermitType}`,
        key_threshold: "Any construction, renovation, or change of use",
      },
      {
        rule_id: "city:zoning_clearance",
        rule_name: `${cityConfig.cityName} Zoning Clearance`,
        applies: cityPermits.zoningClearanceRequired,
        reason: cityPermits.zoningReason,
        key_threshold: `Site review threshold: ${cityConfig.planningDept.siteReviewThresholdSqft.toLocaleString()} sqft`,
      },
      {
        rule_id: "city:fire_review",
        rule_name: `${cityConfig.cityName} Fire Plan Check`,
        applies: fireReview.planCheckRequired,
        reason: fireReview.sprinklerRequired ? fireReview.sprinklerReason : "Standard fire plan check",
        key_threshold: `Sprinkler threshold: ${cityConfig.fireDept.sprinklerThresholdSqft.toLocaleString()} sqft`,
      },
    ],
    expected_permits: [
      ...(cityPermits.buildingPermitRequired ? [`Building Permit (${cityPermits.buildingPermitType})`] : []),
      ...(cityPermits.zoningClearanceRequired ? ["Zoning Clearance"] : []),
      ...(fireReview.planCheckRequired ? ["Fire Plan Check"] : []),
      ...cityPermits.publicWorksPermits,
    ],
    key_questions: [
      `What is the zoning designation for the project site in ${cityConfig.cityName}?`,
      "Is a Conditional Use Permit (CUP) required for this use type in this zone?",
      buildingSqft !== null ? `Building is ${buildingSqft.toLocaleString()} sqft — does this trigger site plan review?` : "What is the building size?",
    ],
  });

  // ── Build warnings ──
  const warnings: string[] = [];
  if (nearSchool) {
    warnings.push(`Project is within 1,000 ft of a school — stricter TAC limits apply (1-in-a-million cancer risk vs 10-in-a-million standard).`);
  }
  if (matchedWaterbody?.tmdl) {
    warnings.push(`Project is near ${matchedWaterbody.name}, a 303(d) impaired waterbody with active TMDLs. Additional effluent limits may apply.`);
  }
  if (ceqa.exceptions_triggered.length > 0) {
    warnings.push(`CEQA exceptions triggered: ${ceqa.exceptions_triggered.join("; ")}`);
  }
  if (isVentura) {
    warnings.push("Ventura County project — ensure all agency references use VCAPCD, not SCAQMD.");
  }

  // ── Build unknowns / data gaps ──
  const unknowns: string[] = [];
  if (buildingSqft === null) unknowns.push("Building square footage not provided — fire review and city permit thresholds may be inaccurate.");
  if (stories === null) unknowns.push("Number of stories not provided — sprinkler requirements may be underestimated.");
  if (occupancyType === null) unknowns.push("Occupancy type not provided — fire alarm requirements may be inaccurate.");
  if (isNewConstruction === null) unknowns.push("New construction vs renovation not specified — assuming new construction for conservative analysis.");
  if (!cityName) unknowns.push("City not identified — using default city config; city-specific requirements may differ.");

  // ── Assemble instruction set ──
  const instructionSet: PermitAnalysisInstructionSet = {
    case_id: `case-${Date.now()}`,
    generated_by: "classifier-agent",
    timestamp: new Date().toISOString(),
    confidence: unknowns.length > 2 ? "low" : unknowns.length > 0 ? "medium" : "high",
    project_summary: projectSummary,
    classification: {
      sic_code: sicCode,
      sic_description: sicDescription,
      land_use_type: (c.land_use_type as string) || "",
      estimated_disturbance_acres: acres,
      near_school: nearSchool,
      near_waterway: nearWaterway,
      involves_hazmat: involvesHazmat,
      location_type: locationType,
      waterway_name: waterwayName,
      school_distance_ft: schoolDistanceFt,
      county: countyConfig.id,
      city: cityName || undefined,
      project_summary: projectSummary,
      key_operations: keyOperations,
      emissions_profile: {
        likely_air_pollutants: emissionsProfile.likely_air_pollutants || [],
        likely_tacs: emissionsProfile.likely_tacs || [],
        wastewater_types: emissionsProfile.wastewater_types || [],
        has_fog: emissionsProfile.has_fog || false,
      },
      building_sqft: buildingSqft,
      stories,
      occupancy_type: occupancyType,
      is_new_construction: isNewConstruction,
    },
    emissions_profile: {
      likely_air_pollutants: emissionsProfile.likely_air_pollutants || [],
      likely_tacs: emissionsProfile.likely_tacs || [],
      wastewater_types: emissionsProfile.wastewater_types || [],
      has_fog: emissionsProfile.has_fog || false,
    },
    location_context: locationContext,
    scale,
    agency_instructions: agencyInstructions,
    warnings,
    unknowns,
  };

  // ── Return with raw thresholds for debugging ──
  return {
    ...instructionSet,
    _raw_thresholds: {
      air_permit: airPermit,
      dust,
      tac,
      igp,
      cgp,
      sanitation,
      cdfw,
      usace,
      fire_hazmat: fireHazmat,
      fire_hazwaste: fireHazwaste,
      ceqa,
      city_permits: cityPermits,
      fire_review: fireReview,
    },
  };
}
