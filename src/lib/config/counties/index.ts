import { CountyConfig, CountyId } from "../../types";
import { LA_COUNTY_CONFIG } from "./la";
import { VENTURA_COUNTY_CONFIG } from "./ventura";

const COUNTY_REGISTRY: Record<CountyId, CountyConfig> = {
  la: LA_COUNTY_CONFIG,
  ventura: VENTURA_COUNTY_CONFIG,
};

export function getCountyConfig(id: CountyId): CountyConfig {
  return COUNTY_REGISTRY[id];
}

export function detectCountyFromAddress(address: string): CountyId {
  const lower = address.toLowerCase();
  const venturaKeywords = ["ventura", "oxnard", "thousand oaks", "simi valley", "camarillo", "moorpark", "ojai", "santa paula", "fillmore", "port hueneme", "carpinteria"];
  if (venturaKeywords.some(kw => lower.includes(kw))) return "ventura";
  return "la"; // default
}

export function detectCountyFromCoordinates(lat: number, lng: number): CountyId {
  // Ventura County roughly: lat 34.0-34.5, lng -119.5 to -118.6
  if (lat >= 34.0 && lat <= 34.5 && lng >= -119.5 && lng <= -118.6) return "ventura";
  return "la";
}

export { LA_COUNTY_CONFIG, VENTURA_COUNTY_CONFIG };
