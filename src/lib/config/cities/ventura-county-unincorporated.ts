import { CityConfig } from "../../types";

export const VENTURA_COUNTY_UNINCORPORATED_CONFIG: CityConfig = {
  cityName: "Unincorporated Ventura County",
  county: "ventura",
  population: 100000,
  buildingDept: {
    name: "Ventura County Building & Safety",
    permitTypes: [
      "Building Permit",
      "Electrical Permit",
      "Plumbing Permit",
      "Mechanical Permit",
      "Grading Permit",
    ],
    fees: "$2,000 - $15,000",
    planCheckTimelineWeeks: 5,
    forms: [
      "Building Permit Application",
      "Plan Check Submittal",
    ],
  },
  fireDept: {
    name: "Ventura County Fire Department",
    planCheckRequired: true,
    sprinklerThresholdSqft: 5000,
    alarmOccupancyTypes: ["A", "E", "H", "I", "R-1"],
    fireFlowRequired: true,
    fees: "$1,500 - $5,000",
  },
  planningDept: {
    name: "Ventura County Planning Division",
    zoningTypes: ["AE", "OS", "RE", "R-1", "R-2", "RPD", "C-1", "C-2", "M-1", "M-2"],
    usePermitRequired: true,
    siteReviewThresholdSqft: 10000,
    fees: "$1,000 - $10,000",
  },
  publicWorks: {
    name: "Ventura County Public Works Agency",
    gradingPermitThresholdCuYd: 50,
    encroachmentPermit: true,
    sewerConnection: true,
    fees: "$800 - $6,000",
  },
};
