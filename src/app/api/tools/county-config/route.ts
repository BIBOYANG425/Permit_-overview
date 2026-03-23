import { getCountyConfig, isValidCountyId } from "@/lib/config/counties";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") || "la";
    const countyId = isValidCountyId(id) ? id : "la";
    const config = getCountyConfig(countyId);

    return NextResponse.json({
      id: config.id,
      name: config.name,
      airDistrict: config.airDistrict,
      waterBoard: config.waterBoard,
      wastewater: config.wastewater,
      fireCupa: config.fireCupa,
      waterbodies: config.waterbodies,
      locationAreas: config.locationAreas,
      regulationsKB: config.regulationsKB,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `County config failed: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 },
    );
  }
}
