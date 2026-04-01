import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter()

PLAIN_API_URL = "https://core-api.uk.plain.com/graphql/v1"
PLAIN_API_KEY = os.environ.get("PLAIN_API_KEY", "")
PLAIN_LABEL_IDS = {
    "comdesk": os.environ.get("PLAIN_LABEL_ID_COMDESK", ""),
    "uninote": os.environ.get("PLAIN_LABEL_ID_UNINOTE", ""),
}

DIFY_BASE_URL = "https://api.dify.ai/v1"
DIFY_API_KEYS = {
    "comdesk": os.environ.get("DIFY_API_KEY_COMDESK", ""),
    "uninote": os.environ.get("DIFY_API_KEY_UNINOTE", ""),
}


class ContactRequest(BaseModel):
    name: str
    email: str
    message: str
    conversation_id: str = ""
    service_id: str


async def _fetch_chat_log(conversation_id: str, service_id: str) -> str:
    if not conversation_id:
        return ""
    api_key = DIFY_API_KEYS.get(service_id, "")
    if not api_key:
        return ""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
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
            return ""

        messages = resp.json().get("data", [])
        lines = []
        for msg in reversed(messages):
            query = msg.get("query", "")
            answer = msg.get("answer", "")
            if query:
                lines.append(f"顧客: {query}")
            if answer:
                lines.append(f"Bot: {answer}")
        return "\n".join(lines)
    except Exception:
        return ""


async def _plain_graphql(query: str, variables: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            PLAIN_API_URL,
            json={"query": query, "variables": variables or {}},
            headers={
                "Authorization": f"Bearer {PLAIN_API_KEY}",
                "Content-Type": "application/json",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Plain API error")
    return resp.json()


@router.post("/contact")
async def create_contact(req: ContactRequest):
    label_id = PLAIN_LABEL_IDS.get(req.service_id)
    if not label_id:
        raise HTTPException(status_code=400, detail=f"Unknown service_id: {req.service_id}")

    # 1. Upsert customer
    upsert_result = await _plain_graphql(
        """
        mutation UpsertCustomer($input: UpsertCustomerInput!) {
          upsertCustomer(input: $input) {
            customer { id }
            error { message }
          }
        }
        """,
        {
            "input": {
                "identifier": {"emailAddress": req.email},
                "onCreate": {
                    "fullName": req.name,
                    "email": {"email": req.email, "isVerified": False},
                },
                "onUpdate": {},
            }
        },
    )

    customer_data = upsert_result.get("data", {}).get("upsertCustomer", {})
    if customer_data.get("error"):
        raise HTTPException(status_code=502, detail=customer_data["error"]["message"])

    customer_id = customer_data.get("customer", {}).get("id")
    if not customer_id:
        raise HTTPException(status_code=502, detail="Failed to create customer")

    # 2. Fetch chat log
    chat_log = await _fetch_chat_log(req.conversation_id, req.service_id)

    # 3. Build thread body
    components = [{"componentText": {"text": req.message}}]
    if chat_log:
        components.append(
            {"componentText": {"text": f"\n--- チャット履歴 ---\n{chat_log}"}}
        )

    # 4. Create thread with label
    thread_result = await _plain_graphql(
        """
        mutation CreateThread($input: CreateThreadInput!) {
          createThread(input: $input) {
            thread { id }
            error { message }
          }
        }
        """,
        {
            "input": {
                "customerIdentifier": {"customerId": customer_id},
                "title": f"[{req.service_id.capitalize()}] {req.name}様からのお問い合わせ",
                "components": components,
                "labelTypeIds": [label_id],
            }
        },
    )

    thread_data = thread_result.get("data", {}).get("createThread", {})
    if thread_data.get("error"):
        raise HTTPException(status_code=502, detail=thread_data["error"]["message"])

    thread_id = thread_data.get("thread", {}).get("id")
    if not thread_id:
        raise HTTPException(status_code=502, detail="Failed to create thread")

    return {"success": True, "thread_id": thread_id}
