from pathlib import Path
from argparse import ArgumentParser
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.staticfiles import StaticFiles
import uvicorn

"""Minimal static file server for FinanceHub frontend.
Usage:
    python serve_frontend.py --port 8083

Serves:
    • /static/*  → modules/financehub/frontend/static
    • /{any path} → financehub.html SPA entry (fallback)
Adds permissive CORS headers so DevTools-jellegű HTML/CSS audit eszközök
( fetch + pre-flight ) 501 hibák nélkül működnek.
"""

ROOT_DIR = Path(__file__).resolve().parent
STATIC_DIR = ROOT_DIR / "static"
ENTRY_HTML = ROOT_DIR / "financehub.html"

if not ENTRY_HTML.exists():
    raise RuntimeError(f"financehub.html not found at {ENTRY_HTML}")

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, title="FinanceHub Frontend Static Server")

# Disable browser-side caching during development so fresh CSS is always fetched
@app.middleware("http")
async def disable_cache_middleware(request: Request, call_next):
    response = await call_next(request)
    # Force fresh fetch on every request – dev-only, safe because this server is for local use
    response.headers["Cache-Control"] = "no-store"
    return response

# Allow everything in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static assets
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(request: Request, full_path: str):
    """Serve static HTML files directly; otherwise return financehub.html."""
    # direct file if exists
    candidate = ROOT_DIR / full_path
    if candidate.exists() and candidate.is_file():
        return FileResponse(candidate)

    # default SPA entry
    if ENTRY_HTML.exists():
        return FileResponse(ENTRY_HTML)
    raise HTTPException(status_code=500, detail="financehub.html missing")


@app.get("/static/css/main_combined_financehub.css", include_in_schema=False)
async def alias_combined_css():
    """Alias during development: always serve the unbundled master CSS so JS loaders requesting the
    combined file still receive up-to-date styles without introducing cascade conflicts."""
    master_css = STATIC_DIR / "main_financehub.css"
    if master_css.exists():
        return FileResponse(master_css)
    raise HTTPException(status_code=404, detail="main_financehub.css not found")


def main():
    parser = ArgumentParser(description="Serve FinanceHub frontend static files")
    parser.add_argument("--port", type=int, default=8083, help="Port to listen on")
    args = parser.parse_args()

    uvicorn.run(
        "serve_frontend:app",
        host="0.0.0.0",
        port=args.port,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main() 