import { identifyEmissions } from "@/lib/tools/identify-emissions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sic_code, operations } = body;
    if (!sic_code || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: "sic_code (string) and operations (non-empty array) are required" }, { status: 400 });
    }
    if (!operations.every((op: unknown) => typeof op === "string" && op.trim().length > 0)) {
      return NextResponse.json({ error: "Every operation must be a non-empty string" }, { status: 400 });
    }
    const result = identifyEmissions({
      sic_code,
      operations,
      has_boiler_or_generator: body.has_boiler_or_generator === true,
      has_refrigeration: body.has_refrigeration === true,
      stores_chemicals: body.stores_chemicals === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Emissions identification failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
