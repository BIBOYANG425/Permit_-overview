import { CityConfig, FireReviewResult } from "../types";

interface FireReviewInput {
  projectType: string;
  occupancyType?: string;
  buildingSizeSqft?: number;
  stories?: number;
  constructionType?: string;
  isNewConstruction: boolean;
  cityConfig: CityConfig;
}

export function fireReviewCheck(input: FireReviewInput): FireReviewResult {
  const fire = input.cityConfig.fireDept;
  const sqft = input.buildingSizeSqft || 0;
  const stories = input.stories || 1;
  const occupancy = (input.occupancyType || "").toUpperCase();
  const projectLower = input.projectType.toLowerCase();
  const requirements: string[] = [];

  // Fire plan check required?
  // Required for all commercial, multi-family, industrial new construction
  const isCommercial = ["commercial", "industrial", "manufacturing", "warehouse", "restaurant", "retail", "office"].some(kw => projectLower.includes(kw));
  const isMultiFamily = ["apartment", "multi-family", "condo", "mixed-use", "residential development"].some(kw => projectLower.includes(kw));
  const planCheckRequired = fire.planCheckRequired && (isCommercial || isMultiFamily || input.isNewConstruction);

  if (planCheckRequired) {
    requirements.push("Fire plan check review required before building permit issuance");
  }

  // Sprinkler system required?
  // California Building Code: all new residential (CRC R313.1), commercial > threshold
  const sprinklerRequired = input.isNewConstruction && (
    sqft >= fire.sprinklerThresholdSqft ||
    isMultiFamily ||
    stories >= 3 ||
    occupancy === "H"
  );

  let sprinklerReason = "Not required based on project parameters";
  if (sprinklerRequired) {
    if (sqft >= fire.sprinklerThresholdSqft) {
      sprinklerReason = `Building size (${sqft.toLocaleString()} sqft) exceeds ${fire.sprinklerThresholdSqft.toLocaleString()} sqft threshold per CBC`;
    } else if (isMultiFamily) {
      sprinklerReason = "Multi-family residential requires automatic fire sprinkler system per CRC R313.1";
    } else if (stories >= 3) {
      sprinklerReason = `Building height (${stories} stories) requires automatic fire sprinkler system per CBC 903.2`;
    } else if (occupancy === "H") {
      sprinklerReason = "High-hazard occupancy (Group H) requires automatic fire sprinkler system per CBC 903.2.5";
    }
    requirements.push(`Automatic fire sprinkler system required: ${sprinklerReason}`);
  }

  // Fire alarm required?
  // Required for occupancy types: A (assembly), E (education), H (high-hazard), I (institutional), R-1 (hotels/motels)
  const alarmRequired = fire.alarmOccupancyTypes.some(t => occupancy.includes(t)) || isMultiFamily || sqft >= 10000;

  let alarmReason = "Not required based on occupancy type";
  if (alarmRequired) {
    if (fire.alarmOccupancyTypes.some(t => occupancy.includes(t))) {
      alarmReason = `Occupancy type ${occupancy} requires fire alarm system per CBC 907`;
    } else if (isMultiFamily) {
      alarmReason = "Multi-family residential requires fire alarm system per CBC 907.2.9";
    } else if (sqft >= 10000) {
      alarmReason = `Building size (${sqft.toLocaleString()} sqft) exceeds 10,000 sqft — fire alarm system recommended per CBC 907`;
    }
    requirements.push(`Fire alarm system required: ${alarmReason}`);
  }

  // Fire flow requirements
  const fireFlowRequired = fire.fireFlowRequired && (isCommercial || isMultiFamily || sqft >= 3600);
  if (fireFlowRequired) {
    // Fire flow based on building size (Appendix B, Table B105.1)
    let flowGpm = 1000;
    if (sqft > 50000) flowGpm = 4000;
    else if (sqft > 25000) flowGpm = 3000;
    else if (sqft > 10000) flowGpm = 2000;
    else if (sqft > 5000) flowGpm = 1500;
    requirements.push(`Minimum fire flow of ${flowGpm} GPM required per CBC Appendix B (based on ${sqft.toLocaleString()} sqft building)`);
  }

  // Timeline and fees
  const estimatedTimelineWeeks = planCheckRequired ? 3 : 0;

  return {
    planCheckRequired,
    sprinklerRequired,
    fireAlarmRequired: alarmRequired,
    fireFlowRequired,
    sprinklerReason,
    alarmReason,
    estimatedTimelineWeeks,
    estimatedFees: fire.fees,
    requirements,
  };
}
