import { classifyBusiness } from "@/lib/tools/classify-business";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_activity, key_processes, is_manufacturing, is_construction, is_commercial_service } = body;
    if (!business_activity) {
      return NextResponse.json({ error: "business_activity is required" }, { status: 400 });
    }
    const result = classifyBusiness({
      business_activity,
      key_processes,
      is_manufacturing: is_manufacturing ?? false,
      is_construction: is_construction ?? false,
      is_commercial_service: is_commercial_service ?? false,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Classification failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
