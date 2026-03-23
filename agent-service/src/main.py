import asyncio

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from src.models.types import AnalyzeRequest
from src.pipeline import run_pipeline
from src.streaming.sse_emitter import SSEEmitter

app = FastAPI(title="LA Permit Navigator Agent Service", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Request body must be a JSON object")
        req = AnalyzeRequest(**body)
    except (ValueError, TypeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e}")

    emitter = SSEEmitter()

    async def run():
        await run_pipeline(
            project_description=req.projectDescription,
            county=req.county,
            city=req.city,
            emitter=emitter,
        )

    task = asyncio.create_task(run())

    async def event_stream():
        try:
            async for chunk in emitter.stream():
                yield chunk
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
