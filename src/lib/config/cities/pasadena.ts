import { CityConfig } from "../../types";

export const PASADENA_CONFIG: CityConfig = {
  cityName: "Pasadena",
  county: "la",
  population: 138000,
  buildingDept: {
    name: "Pasadena Building & Safety Division",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Grading Permit",
    ],
    fees: "$3,000 - $20,000",
    planCheckTimelineWeeks: 6,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
      "Green Building Compliance",
    ],
  },
  fireDept: {
    name: "Pasadena Fire Department",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$2,000 - $6,000",
  },
  planningDept: {
    name: "Pasadena Planning & Community Development",
    zoningTypes: ["RS", "RM", "CG", "CL", "IG", "IL", "OS"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 5000,
    fees: "$2,000 - $12,000",
  },
  publicWorks: {
    name: "Pasadena Public Works Department",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$1,000 - $8,000",
  },
};
