import { CityConfig } from "../../types";

export const OXNARD_CONFIG: CityConfig = {
  cityName: "Oxnard",
  county: "ventura",
  population: 202000,
  buildingDept: {
    name: "Oxnard Development Services",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Grading Permit",
      "Demolition Permit",
    ],
    fees: "$2,000 - $20,000",
    planCheckTimelineWeeks: 5,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
      "Title 24 Energy Compliance",
    ],
  },
  fireDept: {
    name: "Oxnard Fire Department",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$1,500 - $6,000",
  },
  planningDept: {
    name: "Oxnard Planning Division",
    zoningTypes: ["R-1", "R-2", "R-3", "C-1", "C-2", "M-1", "M-2", "AG"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 10000,
    fees: "$1,500 - $10,000",
  },
  publicWorks: {
    name: "Oxnard Public Works Department",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$800 - $6,000",
  },
};
