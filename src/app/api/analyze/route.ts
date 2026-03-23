// SSE Proxy — forwards requests to the Python Agent Service and streams events back to the browser.
// The original hand-rolled pipeline is preserved in route.ts.backup for rollback.

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8080";

export async function POST(req: Request) {
  let projectDescription: string;
  let county: string;
  let city: string;

  try {
    const body = await req.json();
    projectDescription = body.projectDescription;
    county = body.county;
    city = body.city;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!projectDescription || typeof projectDescription !== "string") {
    return new Response(JSON.stringify({ error: "Project description is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Forward to Python agent service
    const upstream = await fetch(`${AGENT_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectDescription, county: county || "la", city: city || "" }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "Agent service unreachable");
      return new Response(JSON.stringify({ error: `Agent service error: ${errText}` }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!upstream.body) {
      return new Response(JSON.stringify({ error: "No stream from agent service" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Pipe the SSE stream through unchanged — the Python service emits the same AgentEvent schema
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Agent service unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
