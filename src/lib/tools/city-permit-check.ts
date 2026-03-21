import { CityConfig, CityPermitResult } from "../types";

interface CityPermitInput {
  projectType: string;
  buildingSizeSqft?: number | null;
  landUse?: string;
  isNewConstruction: boolean | null;
  earthworkCuYd?: number;
  needsSewerConnection?: boolean;
  cityConfig: CityConfig;
}

export function cityPermitCheck(input: CityPermitInput): CityPermitResult {
  const building = input.cityConfig.buildingDept;
  const planning = input.cityConfig.planningDept;
  const pw = input.cityConfig.publicWorks;
  // Treat null sqft as unknown (assume non-zero to avoid silently skipping permits)
  const sqftUnknown = input.buildingSizeSqft === null || input.buildingSizeSqft === undefined;
  const sqft = input.buildingSizeSqft ?? 0;
  const earthwork = input.earthworkCuYd || 0;
  const projectLower = input.projectType.toLowerCase();
  const forms: string[] = [];
  // Treat null isNewConstruction as unknown — conservatively assume true
  const isNewConstruction = input.isNewConstruction ?? true;

  // Building permit
  const isMinor = !isNewConstruction && sqft <= 500 && !sqftUnknown;
  const buildingPermitRequired = !isMinor;
  let buildingPermitType: "over-the-counter" | "plan-check" | "not-required" = "not-required";

  if (buildingPermitRequired) {
    // Over-the-counter for small alterations, plan-check for everything else
    const isSmallAlteration = !isNewConstruction && sqft <= 2000 &&
      !["commercial", "industrial", "manufacturing"].some(kw => projectLower.includes(kw));
    buildingPermitType = isSmallAlteration ? "over-the-counter" : "plan-check";
    forms.push(...building.forms);
  }

  const planCheckTimelineWeeks = buildingPermitType === "plan-check" ? building.planCheckTimelineWeeks : 0;

  // Zoning clearance
  const isUseChange = projectLower.includes("conversion") || projectLower.includes("change of use") || projectLower.includes("adaptive reuse");
  const isLargeProject = sqft >= planning.siteReviewThresholdSqft;
  const zoningClearanceRequired = planning.usePermitRequired && (
    isNewConstruction || isUseChange || isLargeProject
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
  if (pw.encroachmentPermit && (isNewConstruction || isLargeProject)) {
    publicWorksPermits.push("Encroachment Permit (for work in public right-of-way)");
  }
  if (pw.sewerConnection && (isNewConstruction || input.needsSewerConnection)) {
    publicWorksPermits.push("Sewer Connection Permit");
  }
  if (isNewConstruction) {
    publicWorksPermits.push("Water Connection Permit");
  }

  // Total fees — only include components that are triggered
  const feeParts: string[] = [];
  if (buildingPermitRequired) feeParts.push(`${building.fees} (building)`);
  if (zoningClearanceRequired) feeParts.push(`${planning.fees} (planning)`);
  const totalEstimatedFees = feeParts.length > 0 ? feeParts.join(" + ") : "$0";

  return {
    buildingPermitRequired,
    buildingPermitType,
    planCheckTimelineWeeks,
    planCheckFees: buildingPermitType === "plan-check" ? building.fees : "$0",
    zoningClearanceRequired,
    zoningReason,
    gradingPermitRequired,
    publicWorksPermits,
    forms,
    totalEstimatedFees,
  };
}
