import { identifyEmissions } from "@/lib/tools/identify-emissions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accept sic_code as string or number — LLMs often send 2819 instead of "2819".
    // Allow empty: the classifier sometimes calls this before classify_business
    // returns, so sic_code may be "". identifyEmissions still works from
    // operations + boolean flags alone — degraded but better than crashing.
    const raw_sic = body.sic_code ?? body.sicCode ?? "";
    const sic_code = String(raw_sic).trim();
    // operations may legitimately be empty (e.g. a pure commercial office has
    // no process operations) — underlying identifyEmissions handles [] fine
    // and still applies the boolean flags (boiler, refrigeration, chemicals).
    // Coerce to strings and drop blanks so one bad entry doesn't blow up the pipeline.
    const rawOps = Array.isArray(body.operations) ? body.operations : [];
    const operations = rawOps
      .map((op: unknown) => String(op).trim())
      .filter((op: string) => op.length > 0);

    const result = identifyEmissions({
      sic_code,
      operations,
      has_boiler_or_generator: Boolean(body.has_boiler_or_generator),
      has_refrigeration: Boolean(body.has_refrigeration),
      stores_chemicals: Boolean(body.stores_chemicals),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: `Emissions identification failed: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
  }
}
