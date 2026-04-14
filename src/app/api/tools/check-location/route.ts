import { checkLocation } from "@/lib/tools/check-location";
import { getCountyConfig, isValidCountyId } from "@/lib/config/counties";
import { NextRequest, NextResponse } from "next/server";

// Defense-in-depth: the classifier LLM routinely hallucinates parameter names
// (project_address, site_address, location, etc.). The Python side has an
// alias resolver, but if a new alias slips through we'd rather return a
// degraded "unknown jurisdiction" result than 400 and crash the pipeline.
// Accept a wide range of location field names here too.
function pickLocation(body: Record<string, unknown>): string {
  const keys = [
    "city_or_area",
    "location",
    "city",
    "area",
    "city_or_location",
    "project_location",
    "project_address",
    "address",
    "site_address",
    "facility_address",
  ];
  for (const k of keys) {
    const v = body[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const city_or_area = pickLocation(body);
    const { nearby_water_features, mentions_school, school_distance_ft, county } = body;
    const countyId = isValidCountyId(county) ? county : "la";
    const countyConfig = getCountyConfig(countyId);
    // Pass through even when city_or_area is "" — checkLocation() returns a
    // degraded {jurisdiction: "unknown"} result, which downstream agents can
    // still reason over. Better than a hard 400 that kills the pipeline.
    const result = checkLocation({
      city_or_area,
      nearby_water_features,
      mentions_school,
      school_distance_ft,
      county: countyId,
      countyConfig,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Location check failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
