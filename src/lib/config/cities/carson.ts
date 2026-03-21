import { CityConfig } from "../../types";

export const CARSON_CONFIG: CityConfig = {
  cityName: "Carson",
  county: "la",
  population: 95000,
  buildingDept: {
    name: "Carson Community Development",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
    ],
    fees: "$1,500 - $12,000",
    planCheckTimelineWeeks: 4,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
    ],
  },
  fireDept: {
    name: "LA County Fire Department (Contract)",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$1,500 - $5,000",
  },
  planningDept: {
    name: "Carson Planning Division",
    zoningTypes: ["R-1", "R-2", "R-3", "C-1", "C-3", "MH", "ML"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 10000,
    fees: "$1,000 - $8,000",
  },
  publicWorks: {
    name: "Carson Public Works",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$500 - $4,000",
  },
};
