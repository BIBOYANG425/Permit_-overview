import { checkLocation } from "@/lib/tools/check-location";
import { getCountyConfig, isValidCountyId } from "@/lib/config/counties";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { city_or_area, nearby_water_features, mentions_school, school_distance_ft, county } = body;
    if (!city_or_area) {
      return NextResponse.json({ error: "city_or_area is required" }, { status: 400 });
    }
    const countyId = isValidCountyId(county) ? county : "la";
    const countyConfig = getCountyConfig(countyId);
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
