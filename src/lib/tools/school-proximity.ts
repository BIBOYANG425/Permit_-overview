import { CountyConfig } from "../types";

interface SchoolProximityInput {
  location_description: string;
  mentions_school_nearby?: boolean;
  distance_if_known_ft?: number;
  countyConfig?: CountyConfig;
}

interface SchoolProximityResult {
  near_school: boolean;
  distance_ft: number | null;
  enhanced_tac_threshold_applies: boolean;
  threshold_description: string;
  reasoning: string;
}

export function schoolProximityCheck(input: SchoolProximityInput): SchoolProximityResult {
  const locLower = input.location_description.toLowerCase();
  const airName = input.countyConfig?.airDistrict.name || "SCAQMD";
  const tacRule = input.countyConfig?.airDistrict.rules.tac || "Rule 1401/1401.1";

  // Explicit distance provided
  if (input.distance_if_known_ft !== undefined) {
    const isNear = input.distance_if_known_ft <= 1000;
    return {
      near_school: isNear,
      distance_ft: input.distance_if_known_ft,
      enhanced_tac_threshold_applies: isNear,
      threshold_description: isNear
        ? `${airName} ${tacRule} applies — maximum individual cancer risk threshold reduced to 1-in-a-million (from 10-in-a-million)`
        : `Standard ${tacRule} threshold of 10-in-a-million applies`,
      reasoning: `Project is ${input.distance_if_known_ft} ft from nearest school. ${tacRule} threshold is 1,000 ft.`,
    };
  }

  // Check for school keywords
  const schoolKeywords = ["school", "elementary", "middle school", "high school", "preschool", "daycare", "childcare", "early learning", "kindergarten", "academy", "montessori"];
  const mentionsSchool = input.mentions_school_nearby || schoolKeywords.some((kw) => locLower.includes(kw));

  // Check for proximity language
  const proximityKeywords = ["near", "next to", "adjacent", "across from", "within", "close to", "by the", "feet from", "ft from", "yards from"];
  const mentionsProximity = proximityKeywords.some((kw) => locLower.includes(kw));

  // Extract distance if mentioned in text
  const distanceMatch = locLower.match(/(\d+)\s*(?:ft|feet|foot|yards?)/);
  if (distanceMatch && mentionsSchool) {
    let distance = parseInt(distanceMatch[1]);
    if (locLower.includes("yard")) distance *= 3;
    const isNear = distance <= 1000;
    return {
      near_school: isNear,
      distance_ft: distance,
      enhanced_tac_threshold_applies: isNear,
      threshold_description: isNear
        ? `${airName} ${tacRule} applies — maximum individual cancer risk threshold reduced to 1-in-a-million (from 10-in-a-million)`
        : `Standard ${tacRule} threshold of 10-in-a-million applies`,
      reasoning: `Project is approximately ${distance} ft from a school. ${tacRule} threshold is 1,000 ft.`,
    };
  }

  if (mentionsSchool && mentionsProximity) {
    return {
      near_school: true,
      distance_ft: null,
      enhanced_tac_threshold_applies: true,
      threshold_description: `${airName} ${tacRule} likely applies — verify exact distance. Maximum individual cancer risk threshold may be reduced to 1-in-a-million.`,
      reasoning: "Location description suggests proximity to a school but exact distance unknown. Conservative determination: assume within 1,000 ft.",
    };
  }

  if (mentionsSchool) {
    return {
      near_school: true,
      distance_ft: null,
      enhanced_tac_threshold_applies: true,
      threshold_description: `School mentioned in project description — ${tacRule} screening required. Determine exact distance to confirm applicability.`,
      reasoning: `School is referenced in the project description. ${airName} requires distance verification for ${tacRule} applicability.`,
    };
  }

  return {
    near_school: false,
    distance_ft: null,
    enhanced_tac_threshold_applies: false,
    threshold_description: `No school proximity identified — standard ${tacRule} threshold of 10-in-a-million applies. Applicant should verify by checking ${airName}'s facility mapping tool.`,
    reasoning: "No school or educational facility detected in project description. Standard toxic air contaminant thresholds apply.",
  };
}
