import { CityConfig } from "../../types";

export const TORRANCE_CONFIG: CityConfig = {
  cityName: "Torrance",
  county: "la",
  population: 145000,
  buildingDept: {
    name: "Torrance Building & Safety Division",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Demolition Permit",
    ],
    fees: "$2,000 - $15,000",
    planCheckTimelineWeeks: 4,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
      "Title 24 Energy Compliance",
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
    name: "Torrance Community Development Department",
    zoningTypes: ["R-1", "R-2", "R-3", "C-1", "C-2", "M-1", "M-2"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 10000,
    fees: "$1,000 - $8,000",
  },
  publicWorks: {
    name: "Torrance Public Works Department",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$500 - $5,000",
  },
};
