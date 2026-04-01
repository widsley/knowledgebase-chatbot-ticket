import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

router = APIRouter()

DIFY_BASE_URL = "https://api.dify.ai/v1"
DIFY_API_KEYS = {
    "comdesk": os.environ.get("DIFY_API_KEY_COMDESK", ""),
    "uninote": os.environ.get("DIFY_API_KEY_UNINOTE", ""),
}


def _get_dify_key(service_id: str) -> str:
    key = DIFY_API_KEYS.get(service_id)
    if not key:
        raise HTTPException(status_code=400, detail=f"Unknown service_id: {service_id}")
    return key


class ChatRequest(BaseModel):
    message: str
    conversation_id: str = ""
    service_id: str


@router.post("/chat")
async def chat(req: ChatRequest):
    api_key = _get_dify_key(req.service_id)

    body = {
        "inputs": {},
        "query": req.message,
        "response_mode": "streaming",
        "conversation_id": req.conversation_id,
        "user": "widget-user",
    }

    async def event_stream():
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{DIFY_BASE_URL}/chat-messages",
                json=body,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            ) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    yield f'data: {{"event":"error","message":"Dify API error: {resp.status_code}"}}\n\n'
                    return
                async for line in resp.aiter_lines():
                    if line:
                        yield f"{line}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/messages")
async def get_messages(conversation_id: str, service_id: str):
    api_key = _get_dify_key(service_id)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{DIFY_BASE_URL}/messages",
            params={
                "user": "widget-user",
                "conversation_id": conversation_id,
                "limit": 100,
            },
            headers={"Authorization": f"Bearer {api_key}"},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Failed to fetch messages")

    data = resp.json()
    messages = data.get("data", [])

    log_lines = []
    for msg in reversed(messages):
        query = msg.get("query", "")
        answer = msg.get("answer", "")
        if query:
            log_lines.append(f"顧客: {query}")
        if answer:
            log_lines.append(f"Bot: {answer}")

    return {"log": "\n".join(log_lines)}
