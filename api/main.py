from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, contact

app = FastAPI(title="Widsley Support API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(contact.router)


@app.get("/health")
def health():
    return {"status": "ok"}
