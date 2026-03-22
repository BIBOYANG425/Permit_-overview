import { schoolProximityCheck } from "@/lib/tools/school-proximity";
import { getCountyConfig, isValidCountyId } from "@/lib/config/counties";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location_description, mentions_school_nearby, distance_if_known_ft, county } = body;
    if (!location_description) {
      return NextResponse.json({ error: "location_description is required" }, { status: 400 });
    }
    const countyId = isValidCountyId(county) ? county : "la";
    const countyConfig = getCountyConfig(countyId);
    const result = schoolProximityCheck({ location_description, mentions_school_nearby, distance_if_known_ft, countyConfig });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `School proximity check failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
