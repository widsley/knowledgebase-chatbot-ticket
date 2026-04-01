import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

app = FastAPI(title="Widsley Help Center Top")

templates = Jinja2Templates(directory="templates")

SERVICE_ID = os.environ.get("SERVICE_ID", "comdesk")
GITBOOK_BASE_URL = os.environ.get("GITBOOK_BASE_URL", "https://widsley.gitbook.io/comdesk")


@app.get("/", response_class=HTMLResponse)
async def top_page(request: Request):
    return templates.TemplateResponse(f"{SERVICE_ID}.html", {"request": request})


@app.get("/docs/{path:path}")
async def redirect_to_gitbook(path: str):
    return RedirectResponse(
        url=f"{GITBOOK_BASE_URL}/{path}",
        status_code=307,
    )


@app.get("/health")
def health():
    return {"status": "ok"}
