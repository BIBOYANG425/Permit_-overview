import { CityConfig } from "../../types";

export const GLENDALE_CONFIG: CityConfig = {
  cityName: "Glendale",
  county: "la",
  population: 196000,
  buildingDept: {
    name: "Glendale Building & Safety Division",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Demolition Permit",
    ],
    fees: "$2,000 - $18,000",
    planCheckTimelineWeeks: 5,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
      "Structural Calculations",
    ],
  },
  fireDept: {
    name: "Glendale Fire Department",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$1,500 - $6,000",
  },
  planningDept: {
    name: "Glendale Planning Division",
    zoningTypes: ["R1R", "R-1", "R-1250", "R-3050", "C1", "C2", "C3", "IND", "IMU"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 7500,
    fees: "$1,500 - $10,000",
  },
  publicWorks: {
    name: "Glendale Public Works Department",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$800 - $6,000",
  },
};
