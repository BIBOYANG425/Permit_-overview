import { waterwayCheck } from "@/lib/tools/waterway-check";
import { getCountyConfig, isValidCountyId } from "@/lib/config/counties";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location_description, area_of_county, county } = body;
    if (!location_description) {
      return NextResponse.json({ error: "location_description is required" }, { status: 400 });
    }
    const countyId = isValidCountyId(county) ? county : "la";
    const countyConfig = getCountyConfig(countyId);
    const result = waterwayCheck({ location_description, area_of_county, countyConfig });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Waterway check failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
