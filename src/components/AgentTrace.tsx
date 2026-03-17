"use client";

import { useEffect, useRef } from "react";
import { AgentEvent } from "@/lib/types";

const AGENT_COLORS: Record<string, string> = {
  "Project Classifier": "#E8A838",
  "Permit Reasoning Agent": "#3B82F6",
  "Synthesis Agent": "#A855F7",
};

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "agent_start":
      return <span className="text-blue-400">&#9670;</span>;
    case "thought":
      return <span className="text-slate-400">&#9671;</span>;
    case "tool_call":
      return <span className="text-amber-400">&#9881;</span>;
    case "tool_result":
      return <span className="text-emerald-400">&#9745;</span>;
    case "agent_complete":
      return <span className="text-blue-400">&#10003;</span>;
    case "error":
      return <span className="text-red-400">&#10007;</span>;
    default:
      return <span className="text-slate-500">&#8226;</span>;
  }
}

function EventLabel({ type }: { type: string }) {
  switch (type) {
    case "agent_start":
      return <span className="text-blue-400 font-semibold text-xs uppercase tracking-wider">AGENT START</span>;
    case "thought":
      return <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider">THOUGHT</span>;
    case "tool_call":
      return <span className="text-amber-400 font-semibold text-xs uppercase tracking-wider">TOOL CALL</span>;
    case "tool_result":
      return <span className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">RESULT</span>;
    case "agent_complete":
      return <span className="text-blue-400 font-semibold text-xs uppercase tracking-wider">COMPLETE</span>;
    case "error":
      return <span className="text-red-400 font-semibold text-xs uppercase tracking-wider">ERROR</span>;
    default:
      return null;
  }
}

function renderEventContent(event: AgentEvent) {
  switch (event.type) {
    case "agent_start":
      return (
        <div className="border-b border-slate-700/50 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: AGENT_COLORS[event.agent || ""] || "#94A3B8" }}
            />
            <span className="font-bold text-white text-sm">{event.agent}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">{event.model}</div>
        </div>
      );

    case "thought":
      return (
        <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
          {event.content}
        </div>
      );

    case "tool_call":
      return (
        <div className="bg-amber-950/20 border border-amber-900/30 rounded-md p-2.5 my-1">
          <div className="text-amber-300 font-mono text-xs font-bold mb-1">
            {event.tool}()
          </div>
          <pre className="text-amber-200/70 text-xs overflow-x-auto">
            {JSON.stringify(event.input, null, 2)}
          </pre>
        </div>
      );

    case "tool_result":
      return (
        <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-md p-2.5 my-1">
          <div className="text-emerald-300 font-mono text-xs font-bold mb-1">
            {event.tool} result
          </div>
          <pre className="text-emerald-200/70 text-xs overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(event.output, null, 2)}
          </pre>
        </div>
      );

    case "agent_complete":
      return (
        <div className="border-t border-slate-700/50 pt-2 mt-2">
          <span className="text-blue-400 text-sm font-semibold">
            {event.agent} completed
          </span>
        </div>
      );

    case "error":
      return (
        <div className="bg-red-950/30 border border-red-900/50 rounded-md p-2.5">
          <span className="text-red-300 text-sm">{event.error || event.content}</span>
        </div>
      );

    default:
      return null;
  }
}

export default function AgentTrace({
  events,
  isRunning,
}: {
  events: AgentEvent[];
  isRunning: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (events.length === 0 && !isRunning) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-30">&#9670;</div>
          <p className="text-sm">Agent reasoning trace will appear here</p>
          <p className="text-xs text-slate-700 mt-1">Submit a project to see the multi-agent pipeline in action</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-3 scroll-smooth">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-1.5">
          {isRunning && (
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">
            {isRunning ? "Processing..." : "Complete"}
          </span>
        </div>
        <span className="text-xs text-slate-600 ml-auto">{events.length} events</span>
      </div>

      {events.map((event, idx) => (
        <div key={idx} className="flex gap-2.5">
          <div className="flex-shrink-0 mt-0.5 w-5 text-center">
            <EventIcon type={event.type} />
          </div>
          <div className="flex-1 min-w-0">
            <EventLabel type={event.type} />
            <div className="mt-0.5">{renderEventContent(event)}</div>
          </div>
        </div>
      ))}

      {isRunning && (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
          <span>Agent reasoning...</span>
        </div>
      )}
    </div>
  );
}
