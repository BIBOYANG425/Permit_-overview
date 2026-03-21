import { CityConfig } from "../../types";

export const VENTURA_CITY_CONFIG: CityConfig = {
  cityName: "San Buenaventura (Ventura)",
  county: "ventura",
  population: 109000,
  buildingDept: {
    name: "Ventura Building & Safety",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Grading Permit",
    ],
    fees: "$2,000 - $15,000",
    planCheckTimelineWeeks: 4,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
    ],
  },
  fireDept: {
    name: "Ventura City Fire Department",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$1,500 - $5,000",
  },
  planningDept: {
    name: "Ventura Community Development",
    zoningTypes: ["R-1", "R-2", "R-3", "C-1", "C-2", "M-1", "M-2"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 10000,
    fees: "$1,000 - $8,000",
  },
  publicWorks: {
    name: "Ventura Public Works",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$500 - $5,000",
  },
};
