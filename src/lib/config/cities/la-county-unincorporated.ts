import { CityConfig } from "../../types";

export const LA_COUNTY_UNINCORPORATED_CONFIG: CityConfig = {
  cityName: "Unincorporated LA County",
  county: "la",
  population: 1000000,
  buildingDept: {
    name: "LA County Building & Safety",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Grading Permit",
    ],
    fees: "$2,000 - $20,000",
    planCheckTimelineWeeks: 6,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
    ],
  },
  fireDept: {
    name: "LA County Fire Department",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$1,500 - $6,000",
  },
  planningDept: {
    name: "LA County Regional Planning",
    zoningTypes: ["A-1", "A-2", "R-1", "R-2", "R-3", "C-1", "C-2", "C-3", "M-1", "M-2"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 10000,
    fees: "$1,500 - $12,000",
  },
  publicWorks: {
    name: "LA County Public Works",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$1,000 - $8,000",
  },
};
