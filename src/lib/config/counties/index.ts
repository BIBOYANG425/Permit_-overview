import { CountyConfig, CountyId } from "../../types";
import { LA_COUNTY_CONFIG } from "./la";
import { VENTURA_COUNTY_CONFIG } from "./ventura";

const COUNTY_REGISTRY: Record<CountyId, CountyConfig> = {
  la: LA_COUNTY_CONFIG,
  ventura: VENTURA_COUNTY_CONFIG,
};

export function getCountyConfig(id: CountyId): CountyConfig {
  return COUNTY_REGISTRY[id] || COUNTY_REGISTRY.la;
}

export function isValidCountyId(value: unknown): value is CountyId {
  return value === "la" || value === "ventura";
}

export function detectCountyFromAddress(address: string): CountyId {
  const lower = address.toLowerCase();
  // Use word-boundary matching to avoid false positives (e.g., "Ventura Blvd" in LA)
  const venturaKeywords = ["oxnard", "thousand oaks", "simi valley", "camarillo", "moorpark", "ojai", "santa paula", "fillmore", "port hueneme"];
  // Check city names with word boundaries
  for (const kw of venturaKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(lower)) return "ventura";
  }
  // "ventura county" is unambiguous; plain "ventura" could be "Ventura Blvd"
  if (/\bventura\s+county\b/i.test(lower)) return "ventura";
  // Match "Ventura, CA" or "Ventura," patterns (city name, not street)
  if (/\bventura\s*,/i.test(lower)) return "ventura";
  return "la"; // default
}

export function detectCountyFromCoordinates(lat: number, lng: number): CountyId {
  // Ventura County: lat ~34.05-34.5, lng -119.47 to -118.63
  // Tighter bounds to exclude Malibu/Calabasas (LA County)
  if (lat >= 34.05 && lat <= 34.5 && lng >= -119.47 && lng <= -118.63) return "ventura";
  return "la";
}

export { LA_COUNTY_CONFIG, VENTURA_COUNTY_CONFIG };
