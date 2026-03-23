import laGeography from "../data/la-county-geography.json";
import venturaGeography from "../data/ventura-county-geography.json";
import { CountyConfig, WaterbodyData } from "../types";

// ── Geography Entry Type ──

interface GeoEntry {
  name: string;
  type: "incorporated" | "unincorporated";
  watershed: string;
  aqmd: string;
  rwqcb_region: number;
  primary_waterbodies: string[];
  notes?: string;
}

// ── Input / Output Types ──

interface CheckLocationInput {
  city_or_area: string;
  nearby_water_features?: string;
  mentions_school?: boolean;
  school_distance_ft?: number;
  county?: string;
  countyConfig?: CountyConfig;
}

interface CheckLocationResult {
  jurisdiction: "incorporated" | "unincorporated" | "unknown";
  city_name: string | null;
  aqmd: string;
  rwqcb_region: number;
  watershed: string | null;
  nearest_303d_waterbody: string | null;
  waterbody_impairments: string[];
  is_303d_listed: boolean;
  waterbody_is_concrete_lined: boolean | null;
  waterbody_is_jurisdictional: boolean | null;
  mentions_unidentified_drainage: boolean;
  near_school_1000ft: boolean;
  school_distance_ft: number | null;
  in_coastal_zone: boolean;
  confidence: "high" | "low";
  warning: string | null;
}

// ── Geography Dataset Selection ──

const GEOGRAPHY: Record<string, GeoEntry[]> = {
  la: laGeography as GeoEntry[],
  ventura: venturaGeography as GeoEntry[],
};

// ── Geography Matching ──

function matchGeoEntry(cityOrArea: string, county: string): GeoEntry | null {
  const entries = GEOGRAPHY[county] || GEOGRAPHY.la;
  const normalized = cityOrArea.toLowerCase().trim();

  // Pass 1: exact name match
  for (const entry of entries) {
    if (normalized === entry.name.toLowerCase()) return entry;
  }

  // Pass 2: scored matching
  let bestMatch: GeoEntry | null = null;
  let bestScore = 0;

  for (const entry of entries) {
    const entryName = entry.name.toLowerCase();
    let score = 0;

    // Input contains the entry name (e.g., "City of Vernon" contains "Vernon")
    if (normalized.includes(entryName)) score += 10;

    // Entry name contains the input
    if (entryName.includes(normalized)) score += 8;

    // Word-level matching
    const inputWords = normalized.split(/[\s,\-]+/);
    const entryWords = entryName.split(/[\s,\-]+/);
    for (const ew of entryWords) {
      for (const iw of inputWords) {
        if (iw === ew) score += 5;
        else if (iw.includes(ew) || ew.includes(iw)) score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestScore >= 5 ? bestMatch : null;
}

// ── Waterbody Matching (keyword scoring from waterway-check.ts) ──

function findWaterbodyMatch(
  combined: string,
  geoEntry: GeoEntry | null,
  countyConfig?: CountyConfig,
): { waterbody: WaterbodyData | null; mentionsWater: boolean; mentionsDrainage: boolean } {
  const waterKeywords = [
    "channel", "creek", "river", "stream", "wash", "drain", "waterway",
    "waterbody", "lake", "harbor", "bay", "ocean", "coast", "lagoon",
    "slough", "arroyo",
  ];
  const drainageKeywords = ["drain", "drainage", "storm drain", "catch basin", "culvert", "ditch"];

  const mentionsWater = waterKeywords.some((kw) => combined.includes(kw));
  const mentionsDrainage = drainageKeywords.some((kw) => combined.includes(kw));

  if (!countyConfig) {
    return { waterbody: null, mentionsWater, mentionsDrainage };
  }

  const waterbodies = countyConfig.waterbodies;
  let bestMatch: WaterbodyData | null = null;
  let matchScore = 0;

  for (const wb of waterbodies) {
    let score = 0;

    // Keyword matches from countyConfig waterbody keywords
    for (const kw of wb.keywords) {
      if (combined.includes(kw)) score += 2;
    }

    // Drainage area matches
    for (const area of wb.drainage_area) {
      if (combined.includes(area.toLowerCase())) score += 3;
    }

    // Direct name match
    if (combined.includes(wb.name.toLowerCase())) score += 5;

    // Boost if the waterbody name appears in the geo entry's primary_waterbodies
    // Only apply this boost when the input actually mentions water-related terms
    if (geoEntry && mentionsWater) {
      for (const pw of geoEntry.primary_waterbodies) {
        if (pw.toLowerCase() === wb.name.toLowerCase()) score += 4;
        else if (
          wb.name.toLowerCase().includes(pw.toLowerCase()) ||
          pw.toLowerCase().includes(wb.name.toLowerCase())
        ) {
          score += 2;
        }
      }
    }

    if (score > matchScore) {
      matchScore = score;
      bestMatch = wb;
    }
  }

  // Fallback: if no keyword/area match but geo entry has primary_waterbodies, try direct match
  // Only when input actually mentions water-related terms to avoid false positives from city metadata
  if (!bestMatch && geoEntry && geoEntry.primary_waterbodies.length > 0 && mentionsWater) {
    for (const pw of geoEntry.primary_waterbodies) {
      for (const wb of waterbodies) {
        if (wb.name.toLowerCase() === pw.toLowerCase()) {
          bestMatch = wb;
          break;
        }
      }
      if (bestMatch) break;
    }
  }

  return { waterbody: bestMatch, mentionsWater, mentionsDrainage };
}

// ── School Proximity (logic from school-proximity.ts) ──

function checkSchoolProximity(
  combined: string,
  mentionsSchool: boolean | undefined,
  schoolDistanceFt: number | undefined,
): { nearSchool: boolean; distanceFt: number | null } {
  // Explicit non-negative distance provided (negative values like -1 are sentinels for "unknown")
  if (schoolDistanceFt !== undefined && schoolDistanceFt >= 0) {
    return {
      nearSchool: schoolDistanceFt <= 1000,
      distanceFt: schoolDistanceFt,
    };
  }

  // Check for school keywords
  const schoolKeywords = [
    "school", "elementary", "middle school", "high school", "preschool",
    "daycare", "childcare", "early learning", "kindergarten", "academy",
    "montessori",
  ];
  const hasSchoolMention = mentionsSchool || schoolKeywords.some((kw) => combined.includes(kw));

  if (!hasSchoolMention) {
    return { nearSchool: false, distanceFt: null };
  }

  // Extract distance if mentioned in text
  const distanceMatch = combined.match(/(\d+)\s*(?:ft|feet|foot|yards?)/);
  if (distanceMatch) {
    let distance = parseInt(distanceMatch[1]);
    if (combined.includes("yard")) distance *= 3;
    return {
      nearSchool: distance <= 1000,
      distanceFt: distance,
    };
  }

  // Check for proximity language
  const proximityKeywords = [
    "near", "next to", "adjacent", "across from", "within",
    "close to", "by the", "feet from", "ft from", "yards from",
  ];
  const mentionsProximity = proximityKeywords.some((kw) => combined.includes(kw));

  if (mentionsProximity) {
    // Conservative: assume within 1,000 ft if proximity language used with school
    return { nearSchool: true, distanceFt: null };
  }

  // School mentioned but no proximity info — still flag conservatively
  return { nearSchool: true, distanceFt: null };
}

// ── Coastal Zone Check ──

function checkCoastalZone(combined: string, geoEntry: GeoEntry | null): boolean {
  const coastalKeywords = ["malibu", "playa", "marina del rey", "port hueneme"];

  // Check geo entry notes for "coastal"
  if (geoEntry?.notes?.toLowerCase().includes("coastal")) {
    return true;
  }

  // Check input text for coastal keywords
  return coastalKeywords.some((kw) => combined.includes(kw));
}

// ── Concrete-Lined Channel Detection ──

function isConcreteLinedChannel(waterbodyName: string | null, combined: string): boolean | null {
  if (!waterbodyName) return null;

  const concreteLined = [
    "los angeles river", "dominguez channel", "compton creek",
    "ballona creek", "rio hondo", "verdugo wash", "burbank western channel",
    "arroyo seco", "eaton wash", "santa anita wash", "sawpit wash",
  ];

  const nameLower = waterbodyName.toLowerCase();
  if (concreteLined.some((c) => nameLower.includes(c))) return true;

  // Check for concrete/channel keywords in the text
  if (combined.includes("concrete") || combined.includes("lined channel")) return true;

  return null; // Unknown
}

// ── Main Exported Function ──

export function checkLocation(input: CheckLocationInput): CheckLocationResult {
  const countyId = input.county === "ventura" ? "ventura" : "la";

  // Match geographic entry
  const geoEntry = matchGeoEntry(input.city_or_area, countyId);

  // Build combined text for keyword searches
  const combined = [
    input.city_or_area,
    input.nearby_water_features || "",
  ].join(" ").toLowerCase();

  // Find waterbody match
  const { waterbody, mentionsDrainage } = findWaterbodyMatch(
    combined,
    geoEntry,
    input.countyConfig,
  );

  // School proximity
  const { nearSchool, distanceFt } = checkSchoolProximity(
    combined,
    input.mentions_school,
    input.school_distance_ft,
  );

  // Coastal zone
  const inCoastalZone = checkCoastalZone(combined, geoEntry);

  // Concrete-lined channel check
  const waterbodyName = waterbody?.name || null;
  const concreteLinedResult = isConcreteLinedChannel(waterbodyName, combined);

  // Determine 303(d) listing
  const is303d = waterbody?.tmdl === true;

  // Build result
  return {
    jurisdiction: geoEntry ? geoEntry.type : "unknown",
    city_name: geoEntry ? geoEntry.name : null,
    aqmd: geoEntry?.aqmd || (countyId === "ventura" ? "Ventura County APCD" : "South Coast AQMD"),
    rwqcb_region: geoEntry?.rwqcb_region || (countyId === "ventura" ? 3 : 4),
    watershed: geoEntry?.watershed || null,
    nearest_303d_waterbody: is303d ? waterbodyName : null,
    waterbody_impairments: waterbody?.impairments || [],
    is_303d_listed: is303d,
    waterbody_is_concrete_lined: concreteLinedResult,
    waterbody_is_jurisdictional: waterbodyName ? true : null,
    mentions_unidentified_drainage: mentionsDrainage && !waterbody,
    near_school_1000ft: nearSchool,
    school_distance_ft: distanceFt,
    in_coastal_zone: inCoastalZone,
    confidence: geoEntry ? "high" : "low",
    warning: geoEntry
      ? null
      : `Could not match "${input.city_or_area}" to a known city or area in ${countyId === "ventura" ? "Ventura" : "LA"} County. Results use county-level defaults. Verify jurisdiction manually.`,
  };
}
