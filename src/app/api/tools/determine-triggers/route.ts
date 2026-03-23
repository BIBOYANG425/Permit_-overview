import { determineTriggers } from "@/lib/tools/determine-triggers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sic_code } = body;
    if (!sic_code) {
      return NextResponse.json({ error: "sic_code is required" }, { status: 400 });
    }
    const result = determineTriggers({
      sic_code,
      is_manufacturing: body.is_manufacturing ?? false,
      is_construction: body.is_construction ?? false,
      has_air_emissions: body.has_air_emissions ?? false,
      has_tac: body.has_tac ?? false,
      has_process_wastewater: body.has_process_wastewater ?? false,
      has_heavy_metals_in_water: body.has_heavy_metals_in_water ?? false,
      has_fog: body.has_fog ?? false,
      has_hazardous_waste: body.has_hazardous_waste ?? false,
      stores_hazmat: body.stores_hazmat ?? false,
      near_waterway: body.near_waterway ?? false,
      near_school: body.near_school ?? false,
      disturbance_acres: body.disturbance_acres,
      is_new_construction: body.is_new_construction ?? false,
      requires_discretionary_approval: body.requires_discretionary_approval ?? false,
      is_303d_watershed: body.is_303d_watershed ?? false,
      county: body.county,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Trigger determination failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
