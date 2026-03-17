import { getDemoScenario } from "@/lib/demo-cache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing demo id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const scenario = getDemoScenario(id);
  if (!scenario) {
    return new Response(JSON.stringify({ error: "Demo not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stream cached events with realistic delays
  const encoder = new TextEncoder();
  const events = scenario.events;

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

        // Realistic delays by event type
        const delay =
          event.type === "agent_start" ? 300 :
          event.type === "tool_call" ? 150 :
          event.type === "tool_result" ? 200 :
          event.type === "thought" ? 400 :
          event.type === "agent_complete" ? 250 :
          event.type === "final_result" ? 100 : 100;

        await new Promise((r) => setTimeout(r, delay));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
