import { sicLookup } from "@/lib/tools/sic-lookup";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_type, has_manufacturing, has_chemical_processes } = body;
    if (!project_type) {
      return NextResponse.json({ error: "project_type is required" }, { status: 400 });
    }
    const result = sicLookup({ project_type, has_manufacturing, has_chemical_processes });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `SIC lookup failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
