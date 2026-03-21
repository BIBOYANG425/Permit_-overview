import { CityConfig } from "../../types";

export const LONG_BEACH_CONFIG: CityConfig = {
  cityName: "Long Beach",
  county: "la",
  population: 466000,
  buildingDept: {
    name: "Long Beach Development Services",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Demolition Permit",
      "Sign Permit",
    ],
    fees: "$2,500 - $25,000",
    planCheckTimelineWeeks: 6,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
      "Title 24 Report",
    ],
  },
  fireDept: {
    name: "Long Beach Fire Department",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$2,000 - $8,000",
  },
  planningDept: {
    name: "Long Beach Planning Bureau",
    zoningTypes: ["R-1", "R-2", "R-3", "R-4", "CCN", "CCA", "IL", "IG", "IP"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 10000,
    fees: "$1,500 - $15,000",
  },
  publicWorks: {
    name: "Long Beach Public Works Department",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$1,000 - $10,000",
  },
};
