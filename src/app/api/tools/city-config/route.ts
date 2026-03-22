import { getCityConfig, detectCityFromAddress } from "@/lib/config/cities";
import { isValidCountyId } from "@/lib/config/counties";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get("city") || "";
    const county = req.nextUrl.searchParams.get("county") || "la";
    const projectDescription = req.nextUrl.searchParams.get("projectDescription") || "";
    const countyId = isValidCountyId(county) ? county : "la";

    // Auto-detect city from project description if not provided explicitly
    const resolvedCity = city || (projectDescription ? detectCityFromAddress(projectDescription) : null) || "";
    const config = getCityConfig(resolvedCity, countyId);
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: `City config failed: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 },
    );
  }
}
