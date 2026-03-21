import { CityConfig } from "../../types";

export const THOUSAND_OAKS_CONFIG: CityConfig = {
  cityName: "Thousand Oaks",
  county: "ventura",
  population: 126000,
  buildingDept: {
    name: "Thousand Oaks Community Development",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Solar Permit",
    ],
    fees: "$2,500 - $18,000",
    planCheckTimelineWeeks: 5,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
      "Title 24 Energy Compliance",
    ],
  },
  fireDept: {
    name: "Ventura County Fire Department (Contract)",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$1,500 - $5,000",
  },
  planningDept: {
    name: "Thousand Oaks Planning Division",
    zoningTypes: ["RE", "R-1", "RPD", "C-1", "C-2", "CPD", "M-1", "OS"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 10000,
    fees: "$1,500 - $10,000",
  },
  publicWorks: {
    name: "Thousand Oaks Public Works",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$800 - $6,000",
  },
};
