import { CityConfig, CountyId } from "../../types";
import { TORRANCE_CONFIG } from "./torrance";
import { PASADENA_CONFIG } from "./pasadena";
import { LONG_BEACH_CONFIG } from "./long-beach";
import { GLENDALE_CONFIG } from "./glendale";
import { CARSON_CONFIG } from "./carson";
import { OXNARD_CONFIG } from "./oxnard";
import { VENTURA_CITY_CONFIG } from "./ventura";
import { THOUSAND_OAKS_CONFIG } from "./thousand-oaks";
import { LA_COUNTY_UNINCORPORATED_CONFIG } from "./la-county-unincorporated";
import { VENTURA_COUNTY_UNINCORPORATED_CONFIG } from "./ventura-county-unincorporated";

const CITY_REGISTRY: Record<string, CityConfig> = {
  "torrance": TORRANCE_CONFIG,
  "pasadena": PASADENA_CONFIG,
  "long beach": LONG_BEACH_CONFIG,
  "glendale": GLENDALE_CONFIG,
  "carson": CARSON_CONFIG,
  "oxnard": OXNARD_CONFIG,
  "ventura": VENTURA_CITY_CONFIG,
  "san buenaventura": VENTURA_CITY_CONFIG,
  "thousand oaks": THOUSAND_OAKS_CONFIG,
};

const FALLBACK_CONFIGS: Record<CountyId, CityConfig> = {
  la: LA_COUNTY_UNINCORPORATED_CONFIG,
  ventura: VENTURA_COUNTY_UNINCORPORATED_CONFIG,
};

export function getCityConfig(cityName: string, countyId: CountyId): CityConfig {
  const key = cityName.toLowerCase().trim();
  return CITY_REGISTRY[key] || FALLBACK_CONFIGS[countyId];
}

export function detectCityFromAddress(address: string): string | null {
  const lower = address.toLowerCase();
  const cities = [
    "torrance", "pasadena", "long beach", "glendale", "carson",
    "oxnard", "ventura", "san buenaventura", "thousand oaks",
  ];
  for (const city of cities) {
    if (lower.includes(city)) return city;
  }
  return null;
}

export {
  TORRANCE_CONFIG,
  PASADENA_CONFIG,
  LONG_BEACH_CONFIG,
  GLENDALE_CONFIG,
  CARSON_CONFIG,
  OXNARD_CONFIG,
  VENTURA_CITY_CONFIG,
  THOUSAND_OAKS_CONFIG,
  LA_COUNTY_UNINCORPORATED_CONFIG,
  VENTURA_COUNTY_UNINCORPORATED_CONFIG,
};
