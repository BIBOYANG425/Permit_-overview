import { CountyConfig, WaterbodyData } from "../types";

interface WaterwayCheckInput {
  location_description: string;
  area_of_county?: string;
  countyConfig: CountyConfig;
}

interface WaterwayCheckResult {
  nearest_waterbody: string | null;
  distance_category: "adjacent" | "within_500ft" | "within_1mi" | "none_identified";
  impairments: string[];
  nal_monitoring_required: boolean;
  agency_jurisdiction: string;
  tmdl_applies: boolean;
  additional_bmps_required: boolean;
}

export function waterwayCheck(input: WaterwayCheckInput): WaterwayCheckResult {
  const locLower = input.location_description.toLowerCase();
  const areaLower = (input.area_of_county || "").toLowerCase();
  const combined = `${locLower} ${areaLower}`;
  if (!input.countyConfig) {
    throw new Error("countyConfig is required for waterway check");
  }
  const waterbodies = input.countyConfig.waterbodies;
  const boardName = input.countyConfig.waterBoard.name;

  const waterKeywords = ["channel", "creek", "river", "stream", "wash", "drain", "waterway", "waterbody", "lake", "harbor", "bay", "ocean", "coast"];
  const mentionsWater = waterKeywords.some((kw) => combined.includes(kw));

  let bestMatch: WaterbodyData | null = null;
  let matchScore = 0;

  for (const wb of waterbodies) {
    let score = 0;
    for (const kw of wb.keywords) {
      if (combined.includes(kw)) score += 2;
    }
    for (const area of wb.drainage_area) {
      if (combined.includes(area.toLowerCase())) score += 3;
    }
    if (combined.includes(wb.name.toLowerCase())) score += 5;

    if (score > matchScore) {
      matchScore = score;
      bestMatch = wb;
    }
  }

  if (!bestMatch && !mentionsWater) {
    return {
      nearest_waterbody: null,
      distance_category: "none_identified",
      impairments: [],
      nal_monitoring_required: false,
      agency_jurisdiction: boardName,
      tmdl_applies: false,
      additional_bmps_required: false,
    };
  }

  if (bestMatch) {
    const isAdjacent = mentionsWater || combined.includes("near") || combined.includes("next to") || combined.includes("adjacent");
    return {
      nearest_waterbody: bestMatch.name,
      distance_category: isAdjacent ? "adjacent" : "within_1mi",
      impairments: bestMatch.impairments,
      nal_monitoring_required: true,
      agency_jurisdiction: `${boardName} / US Army Corps of Engineers (if waters of the US)`,
      tmdl_applies: bestMatch.tmdl,
      additional_bmps_required: true,
    };
  }

  return {
    nearest_waterbody: "Unidentified drainage channel",
    distance_category: "within_500ft",
    impairments: ["Unknown — site-specific assessment required"],
    nal_monitoring_required: true,
    agency_jurisdiction: boardName,
    tmdl_applies: false,
    additional_bmps_required: true,
  };
}
