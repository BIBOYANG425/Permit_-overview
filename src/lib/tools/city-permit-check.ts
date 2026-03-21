import { CityConfig, CityPermitResult } from "../types";

interface CityPermitInput {
  projectType: string;
  buildingSizeSqft?: number;
  landUse?: string;
  isNewConstruction: boolean;
  earthworkCuYd?: number;
  needsSewerConnection?: boolean;
  cityConfig: CityConfig;
}

export function cityPermitCheck(input: CityPermitInput): CityPermitResult {
  const building = input.cityConfig.buildingDept;
  const planning = input.cityConfig.planningDept;
  const pw = input.cityConfig.publicWorks;
  const sqft = input.buildingSizeSqft || 0;
  const earthwork = input.earthworkCuYd || 0;
  const projectLower = input.projectType.toLowerCase();
  const forms: string[] = [];

  // Building permit
  const isMinor = !input.isNewConstruction && sqft <= 500;
  const buildingPermitRequired = !isMinor;
  let buildingPermitType: "over-the-counter" | "plan-check" | "not-required" = "not-required";

  if (buildingPermitRequired) {
    // Over-the-counter for small alterations, plan-check for everything else
    const isSmallAlteration = !input.isNewConstruction && sqft <= 2000 &&
      !["commercial", "industrial", "manufacturing"].some(kw => projectLower.includes(kw));
    buildingPermitType = isSmallAlteration ? "over-the-counter" : "plan-check";
    forms.push(...building.forms);
  }

  const planCheckTimelineWeeks = buildingPermitType === "plan-check" ? building.planCheckTimelineWeeks : 0;

  // Zoning clearance
  const isUseChange = projectLower.includes("conversion") || projectLower.includes("change of use") || projectLower.includes("adaptive reuse");
  const isLargeProject = sqft >= planning.siteReviewThresholdSqft;
  const zoningClearanceRequired = planning.usePermitRequired && (
    input.isNewConstruction || isUseChange || isLargeProject
  );

  let zoningReason = "Standard use within existing zoning — no clearance required";
  if (zoningClearanceRequired) {
    if (isUseChange) {
      zoningReason = "Change of use requires zoning clearance verification and potential conditional use permit";
    } else if (isLargeProject) {
      zoningReason = `Project exceeds ${planning.siteReviewThresholdSqft.toLocaleString()} sqft site review threshold — site plan review required`;
    } else {
      zoningReason = "New construction requires zoning clearance to verify conformance with applicable zone";
    }
    forms.push("Zoning Clearance Application");
  }

  // Grading permit
  const gradingPermitRequired = earthwork >= pw.gradingPermitThresholdCuYd;
  if (gradingPermitRequired) {
    forms.push("Grading Permit Application");
  }

  // Public works permits
  const publicWorksPermits: string[] = [];
  if (pw.encroachmentPermit && (input.isNewConstruction || isLargeProject)) {
    publicWorksPermits.push("Encroachment Permit (for work in public right-of-way)");
  }
  if (pw.sewerConnection && (input.isNewConstruction || input.needsSewerConnection)) {
    publicWorksPermits.push("Sewer Connection Permit");
  }
  if (input.isNewConstruction) {
    publicWorksPermits.push("Water Connection Permit");
  }

  // Total fees
  const totalEstimatedFees = buildingPermitRequired
    ? `${building.fees} (building) + ${planning.fees} (planning)`
    : planning.fees;

  return {
    buildingPermitRequired,
    buildingPermitType,
    planCheckTimelineWeeks,
    planCheckFees: building.fees,
    zoningClearanceRequired,
    zoningReason,
    gradingPermitRequired,
    publicWorksPermits,
    forms,
    totalEstimatedFees,
  };
}
