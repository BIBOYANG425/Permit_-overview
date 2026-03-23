import { identifyEmissions } from "@/lib/tools/identify-emissions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sic_code, operations, has_boiler_or_generator, has_refrigeration, stores_chemicals } = body;
    if (!sic_code || !operations) {
      return NextResponse.json({ error: "sic_code and operations are required" }, { status: 400 });
    }
    const result = identifyEmissions({ sic_code, operations, has_boiler_or_generator, has_refrigeration, stores_chemicals });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Emissions identification failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
