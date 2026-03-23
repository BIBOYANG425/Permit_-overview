import { determineTriggers } from "@/lib/tools/determine-triggers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sic_code, is_manufacturing, is_construction, has_air_emissions, stores_hazmat, near_waterway, is_new_construction } = body;
    if (!sic_code) {
      return NextResponse.json({ error: "sic_code is required" }, { status: 400 });
    }
    const result = determineTriggers({
      sic_code,
      is_manufacturing: is_manufacturing ?? false,
      is_construction: is_construction ?? false,
      has_air_emissions: has_air_emissions ?? false,
      has_tac: body.has_tac,
      has_process_wastewater: body.has_process_wastewater,
      has_heavy_metals_in_water: body.has_heavy_metals_in_water,
      has_fog: body.has_fog,
      has_hazardous_waste: body.has_hazardous_waste,
      stores_hazmat: stores_hazmat ?? false,
      near_waterway: near_waterway ?? false,
      near_school: body.near_school,
      disturbance_acres: body.disturbance_acres,
      is_new_construction: is_new_construction ?? false,
      requires_discretionary_approval: body.requires_discretionary_approval,
      is_303d_watershed: body.is_303d_watershed,
      county: body.county,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Trigger determination failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
