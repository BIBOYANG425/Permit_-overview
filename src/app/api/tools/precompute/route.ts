import { preComputeToolResults } from "@/lib/tools/precompute";
import { getCountyConfig, isValidCountyId } from "@/lib/config/counties";
import { getCityConfig } from "@/lib/config/cities";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classification, county, city } = body;
    if (!classification) {
      return NextResponse.json({ error: "classification is required" }, { status: 400 });
    }
    const countyId = isValidCountyId(county) ? county : "la";
    const countyConfig = getCountyConfig(countyId);
    const cityConfig = getCityConfig(city || "", countyId);
    const result = preComputeToolResults(classification, countyConfig, cityConfig);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Precompute failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
