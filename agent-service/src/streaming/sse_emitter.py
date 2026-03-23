import asyncio
from typing import Any, AsyncGenerator

from src.models.types import AgentEvent


class SSEEmitter:
    """Emits Server-Sent Events matching the AgentEvent schema."""

    def __init__(self) -> None:
        self._queue: asyncio.Queue[AgentEvent | None] = asyncio.Queue()

    def emit(self, event: AgentEvent) -> None:
        self._queue.put_nowait(event)

    def done(self) -> None:
        self._queue.put_nowait(None)

    # ── Convenience methods ──

    def emit_agent_start(self, agent: str, model: str) -> None:
        self.emit(AgentEvent(type="agent_start", agent=agent, model=model))

    def emit_thought(self, agent: str, content: str) -> None:
        self.emit(AgentEvent(type="thought", agent=agent, content=content))

    def emit_tool_call(self, agent: str, tool: str, input_data: dict[str, Any]) -> None:
        self.emit(AgentEvent(type="tool_call", agent=agent, tool=tool, input=input_data))

    def emit_tool_result(self, agent: str, tool: str, output_data: dict[str, Any]) -> None:
        self.emit(AgentEvent(type="tool_result", agent=agent, tool=tool, output=output_data))

    def emit_agent_complete(self, agent: str, result: Any) -> None:
        self.emit(AgentEvent(type="agent_complete", agent=agent, result=result))

    def emit_final_result(self, data: dict[str, Any]) -> None:
        self.emit(AgentEvent(type="final_result", data=data))

    def emit_error(self, error: str, agent: str | None = None) -> None:
        self.emit(AgentEvent(type="error", error=error, agent=agent))

    def emit_model_route(self, agent: str, model: str, content: str) -> None:
        self.emit(AgentEvent(type="model_route", agent=agent, model=model, content=content))

    # ── Async generator for streaming ──

    async def stream(self) -> AsyncGenerator[str, None]:
        while True:
            event = await self._queue.get()
            if event is None:
                break
            yield f"data: {event.model_dump_json()}\n\n"
