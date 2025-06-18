# backend/main.py
# AEVOREX FinBot - Premium Backend - Enterprise Edition v1.0.0
# =============================================================================
# Main Application Entry Point (FastAPI)
#
# Core Responsibilities:
#   1. Critical Initialization Sequence:
#      - Load and validate application configuration (fatal on error).
#      - Configure centralized logging (fatal on error).
#   2. FastAPI Application Instantiation:
#      - Initialize FastAPI app with metadata from configuration.
#      - Integrate lifespan manager for managing global resources (e.g., HTTP client).
#   3. Middleware Configuration:
#      - Configure CORS middleware based on settings.
#      - (Extensible for other future middleware like request tracing, advanced auth).
#   4. Static Files and Single Page Application (SPA) Support:
#      - Mount frontend directory for serving static assets and enabling SPA routing.
#   5. API Router Integration:
#      - Include and prefix API routers for modular endpoint management.
#      - Provide debug capabilities for listing all registered routes.
#   6. Core Health and Utility Endpoints:
#      - Define essential endpoints like '/api/health' for monitoring.
#   7. Development Server Execution:
#      - Enable Uvicorn server startup for local development when run directly.
#
# Principles: Robustness, Maintainability, Clarity, Configuration-Driven.
# =============================================================================

import sys
import asyncio
from pathlib import Path

# ----------------------------------------------------------------------------
# Minimal bootstrap to guarantee that the monorepo roots are discoverable *before*
# we attempt any absolute ``modules.*`` imports (incl. ``utils.path_manager``).
# The logic is intentionally duplicated here (instead of importing the helper)
# because that helper itself lives under ``modules`` and therefore cannot be
# imported until we make sure the path is set up correctly.
# ----------------------------------------------------------------------------
_current_file = Path(__file__).resolve()
# Traverse upwards to find the first ancestor named "Aevorex_codes".
_aevorex_root = next((p for p in _current_file.parents if p.name == "Aevorex_codes"), None)
if _aevorex_root is None:  # Fallback – climb three levels as a last resort
    _aevorex_root = _current_file.parents[3]
_workspace_root = _aevorex_root.parent
for _pth in (_aevorex_root, _workspace_root):
    _str_pth = str(_pth)
    if _pth.is_dir() and _str_pth not in sys.path:
        sys.path.insert(0, _str_pth)

# Ensure the canonical helper still runs (idempotent) now that import will succeed.
try:
    from modules.financehub.backend.utils.path_manager import ensure_pythonpath  # type: ignore
    ensure_pythonpath(__file__)
except Exception as path_init_err:  # pragma: no cover – bootstrap must never fail
    # Fallback: at least log to stderr so the failure reason is visible.
    print(f"[FinBotPathManager] WARNING – failed to ensure PYTHONPATH: {path_init_err}", file=sys.stderr)

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union
import mimetypes
import logging
import os

# Set up basic logging before any imports
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("aevorex_finbot_api.main")

# --- Phase 1: Critical Pre-Flight Checks & Initialization ---

# 1.1. Load Application Configuration (Absolute First Step)
# Configuration is pivotal. Any failure here is unrecoverable.
try:
    # Add the parent directory to Python path to find modules
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    
    from modules.financehub.backend.config import settings
    logger.info(f"Successfully imported settings from config module.")
except ImportError as e:
    logger.critical(f"FATAL: Cannot import config settings: {e}")
    logger.critical("Application cannot start without configuration. Exiting...")
    sys.exit("Configuration import failed.")

# Application Logger Name
APP_LOGGER_NAME = "aevorex_finbot_api" # Vagy ami a hierarchiában logikus
# 1.2. Configure Centralized Logging (Immediately After Successful Configuration Load)
# Logging must be available as early as possible for diagnostics.
try:
    from modules.financehub.backend.utils.logger_config import setup_logging, get_logger
    setup_logging()  # Configures logging based on 'settings.ENVIRONMENT.LOG_LEVEL', etc.
    logger = get_logger("aevorex_finbot_api.main") # Specific logger instance for this module
    logger.info(f"Successfully initialized logger. Log level set to: {settings.ENVIRONMENT.LOG_LEVEL}.")
except ImportError as logger_import_error:
    # This error is critical as logging is essential.
    print(f"FATAL STARTUP ERROR: Cannot import logger module 'modules.financehub.backend.utils.logger_config'. {logger_import_error}", file=sys.stderr)
    sys.exit(f"Application halted: Logger module import failed: {logger_import_error}")
except Exception as logger_setup_error:
    print(f"FATAL STARTUP ERROR: Failed to setup logger. {logger_setup_error}", file=sys.stderr)
    sys.exit(f"Application halted: Logger setup failure: {logger_setup_error}")

# --- Phase 2: Core Application Setup ---

# 2.1. Import FastAPI and Related Components
# These are core to the application's web framework.
try:
    from fastapi import FastAPI, HTTPException, Request
    from fastapi.routing import APIRoute, Mount as FastAPIMount
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import JSONResponse, HTMLResponse
except ImportError as fastapi_import_error:
    logger.critical(f"CRITICAL FAILURE: Essential FastAPI modules not found. {fastapi_import_error}", exc_info=True)
    sys.exit(f"Application halted: Missing FastAPI dependencies: {fastapi_import_error}")

# === DIRECT YFINANCE IMPORT TEST (Phase 2.1.5) ===
logger.info("--- Performing direct yfinance import test ---")
try:
    import yfinance as yf_direct_test
    import traceback # Szükséges a traceback kiíratáshoz hiba esetén

    logger.info(f"--- DIRECT YFINANCE IMPORT TEST SUCCEEDED --- Path: {yf_direct_test.__file__}")
    # Opcionális: Próbálj meg egy egyszerű hívást is, hogy a belső függőségek is rendben vannak-e
    # try:
    #     msft = yf_direct_test.Ticker("MSFT") # Példa ticker
    #     logger.info(f"--- DIRECT YFINANCE TICKER TEST SUCCEEDED --- Info keys count: {len(msft.info)}")
    # except Exception as e_ticker_test:
    #      logger.error(f"--- DIRECT YFINANCE TICKER TEST FAILED --- Error: {e_ticker_test}", exc_info=True)
except ImportError as e_direct:
    logger.critical(f"--- DIRECT YFINANCE IMPORT TEST FAILED (ImportError) --- Error: {e_direct}", exc_info=True)
    # Itt nem állítjuk le az alkalmazást, csak naplózzuk a kritikus hibát.
    # A fetchers/__init__.py később újra megpróbálja, és ott kezeli a hibát.
except Exception as e_direct_other:
    logger.critical(f"--- DIRECT YFINANCE IMPORT TEST FAILED (Other Exception) --- Error: {e_direct_other}", exc_info=True)
# =====================================================

# 2.2. Import Project-Specific Dependencies and API Routers
# Includes API logic, dependency injection setups, and specific endpoint routers.
try:
    from modules.financehub.backend.api import deps as api_dependencies # For lifespan_manager, global clients
    # UNIFIED STOCK ENDPOINTS - Single unified stock router that includes all stock endpoints
    from modules.financehub.backend.api.endpoints.stock_endpoints import stock_router
    from modules.financehub.backend.api.market_data import router as market_data_router
    from modules.financehub.backend.api.endpoints.ai import ai_router  # NEW: AI model catalogue router
    logger.debug("API dependencies and unified stock router imported successfully.")
except ImportError as project_import_error:
    logger.critical(f"CRITICAL FAILURE: Could not import project-specific API modules or dependencies. {project_import_error}", exc_info=True)
    sys.exit(f"Application halted: Failed to import API router/dependency modules: {project_import_error}")
except Exception as general_import_failure: # Catch-all for other unexpected import issues
    logger.critical(f"CRITICAL FAILURE during general module imports: {general_import_failure}", exc_info=True)
    sys.exit(f"Application halted: Unexpected import error: {general_import_failure}")


# 2.3. Instantiate FastAPI Application
logger.info("Initializing FastAPI application core...")
try:
    # Define OpenAPI tags for documentation ordering and metadata
    openapi_tags_metadata = [
        {"name": "Health", "description": "API health and status checks."},
        {"name": "Chat", "description": "Endpoints for interacting with the FinBot chat assistant."},
        {"name": "Unified Stock Data", "description": "Unified endpoints for retrieving stock-related information."},
        {"name": "Market Data", "description": "Endpoints for general market data."},
        {"name": "AI", "description": "AI utilities such as model catalogue."},
        # Add other primary tags here for desired order in API docs
    ]

    app = FastAPI(
        title=settings.APP_META.TITLE,
        description=settings.APP_META.DESCRIPTION,
        version=settings.APP_META.VERSION,
        lifespan=api_dependencies.lifespan_manager,  # Manages app startup/shutdown events (e.g., DB connections, HTTP client)
        openapi_url=f"{settings.API_PREFIX}/openapi.json",
        docs_url=f"{settings.API_PREFIX}/docs",       # Swagger UI
        redoc_url=f"{settings.API_PREFIX}/redoc",     # ReDoc UI
        openapi_tags=openapi_tags_metadata
    )
    logger.info(f"FastAPI application '{settings.APP_META.TITLE}' v{settings.APP_META.VERSION} initialized.")
    logger.info(f"Running in '{settings.ENVIRONMENT.NODE_ENV}' mode.")
    logger.debug(f"API documentation available at: {app.docs_url} and {app.redoc_url}")
except AttributeError as app_config_attr_error:
    logger.critical(f"CRITICAL FAILURE: Missing attribute in 'settings' for FastAPI app (e.g., APP_META or API_PREFIX). {app_config_attr_error}", exc_info=True)
    sys.exit(f"Application halted: Configuration attribute error for FastAPI app: {app_config_attr_error}")
except Exception as app_init_error:
    logger.critical(f"CRITICAL FAILURE during FastAPI application instantiation. {app_init_error}", exc_info=True)
    sys.exit(f"Application halted: FastAPI instantiation failed: {app_init_error}")

# --- Phase 3: Middleware Configuration ---
logger.info("Configuring application middleware...")

# AEVOREX Clean CORS Configuration
# Replacing previous complex/temporary logic with a clear, explicit configuration.
if hasattr(settings, 'CORS') and settings.CORS.ENABLED:
    allowed_origins = [
        "http://localhost:8083",      # Local Frontend (hostname)
        "https://stocks.aevorex.com", # Production Frontend
    ]

    # Dynamically add origins from settings if they exist and are not duplicates
    if hasattr(settings.CORS, 'ALLOWED_ORIGINS') and settings.CORS.ALLOWED_ORIGINS:
        for origin in settings.CORS.ALLOWED_ORIGINS:
            if origin and origin not in allowed_origins:
                allowed_origins.append(origin)

    logger.info(f"CORS middleware enabled. Allowing origins: {allowed_origins}")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*", "Authorization", "Content-Type"],
        expose_headers=["Content-Disposition"],
    )
else:
    logger.warning("CORS middleware is DISABLED. This is not recommended for production.")

# --- Phase 4: API Router Integration ---
logger.info("Including API routers with specified prefixes...")
try:
    # UNIFIED STOCK ROUTER - includes all stock endpoints
    app.include_router(
        stock_router,
        prefix=f"{settings.API_PREFIX}",  # stock_router már tartalmazza a /stock prefixet
        tags=["Stock Data"] 
    )
    logger.info(f"Included 'stock_router' with all stock endpoints under prefix '{settings.API_PREFIX}/stock'.")

    # Market Data API Router
    app.include_router(
        market_data_router,
        prefix=f"{settings.API_PREFIX}/market", # e.g., /api/v1/market
        tags=["Market Data"]
    )
    logger.info(f"Included 'market_data_router' under prefix '{settings.API_PREFIX}/market'.")

    # AI Model Catalogue Router
    app.include_router(
        ai_router,
        prefix=f"{settings.API_PREFIX}",  # ai_router already has /ai prefix
        tags=["AI"]
    )
    logger.info(f"Included 'ai_router' under prefix '{settings.API_PREFIX}/ai'.")

    # Prometheus Metrics Router (optional)
    try:
        from modules.financehub.backend.core.metrics.prometheus_exporter import (
            PrometheusExporter, get_metrics_router,
        )

        exporter = PrometheusExporter()
        app.include_router(get_metrics_router(exporter), prefix="", tags=["Metrics"])
        logger.info("Prometheus metrics router mounted at /metrics")
    except Exception as metrics_err:  # noqa: BLE001
        logger.warning("Metrics exporter unavailable: %s", metrics_err)

    # Debug Log for Registered Routes (Highly useful for development and diagnostics)
    if settings.ENVIRONMENT.LOG_LEVEL.upper() == "DEBUG":
        logger.debug("=" * 70)
        logger.debug("Registered Application Routes (Path, Methods, Name, Type):")
        route_details: List[str] = []
        for r in app.routes:
            if isinstance(r, APIRoute):
                route_details.append(f"  - Path: {r.path}, Methods: {r.methods}, Name: {r.name}, Type: APIRoute")
            elif isinstance(r, FastAPIMount):
                # For StaticFiles mounts, r.app is the StaticFiles instance.
                static_dir = getattr(r.app, "directory", "N/A (Not StaticFiles or dir not exposed)")
                route_details.append(f"  - Path: {r.path}, Name: {r.name}, Type: Mount (App: {type(r.app).__name__}, Dir: {static_dir})")
            elif hasattr(r, "path"): # Fallback for other route types like WebSocketRoute
                methods = getattr(r, "methods", "N/A (e.g. WebSocket)")
                route_details.append(f"  - Path: {r.path}, Methods: {methods}, Name: {r.name}, Type: {type(r).__name__}")
            else:
                route_details.append(f"  - Route: (Complex Route Object: {type(r).__name__})")
        
        for detail in sorted(route_details): # Sort for consistent output
            logger.debug(detail)
        logger.debug("=" * 70)

except Exception as router_integration_error:
     logger.critical(f"CRITICAL FAILURE: Error including one or more API routers. {router_integration_error}", exc_info=True)
     sys.exit(f"Application halted: Router integration error: {router_integration_error}")

# --- Phase 6: Core Health and Utility Endpoints ---
logger.info("Setting up core API endpoints (e.g., health check)...")

@app.get(
    f"{settings.API_PREFIX}/health",
    tags=["Health"],
    summary="Comprehensive API Health Check",
    response_description="Provides the operational status of the API and its critical dependencies."
)
async def health_check_endpoint(request: Request) -> Dict[str, Any]:
    """
    Comprehensive health check endpoint that provides detailed status information
    about the API and its dependencies.
    
    Returns:
        Dict containing health status, timestamp, version info, and dependency checks.
    """
    try:
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "version": settings.APP_META.VERSION,
            "environment": settings.ENVIRONMENT,
            "endpoints": {
                "stock_fundamentals": f"{settings.API_PREFIX}/stock/fundamentals",
                "stock_news": f"{settings.API_PREFIX}/stock/news",
                "stock_ai_summary": f"{settings.API_PREFIX}/stock/ai-summary",
                "stock_chart": f"{settings.API_PREFIX}/stock/chart",
                "stock_search": f"{settings.API_PREFIX}/stock/search",
                "stock_ticker_tape": f"{settings.API_PREFIX}/stock/ticker-tape",
                "chat": f"{settings.API_PREFIX}/stock/chat",
                "market_data": f"{settings.API_PREFIX}/market",
                "ai_models": f"{settings.API_PREFIX}/ai/models"
            },
            "dependencies": {
                "fastapi": "✅ operational",
                "stock_router": "✅ operational",
                "fundamentals_router": "✅ operational",
                "news_router": "✅ operational",
                "ai_summary_router": "✅ operational",
                "chart_router": "✅ operational",
                "search_router": "✅ operational",
                "ticker_tape_router": "✅ operational",
                "chat_router": "✅ operational",
                "market_data_router": "✅ operational",
                "ai_router": "✅ operational"
            }
        }
        
        logger.debug("Health check completed successfully.")
        return health_data
        
    except Exception as health_check_error:
        logger.error(f"Health check failed: {health_check_error}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Health check failed due to internal error."
        )

logger.info(f"Health check endpoint configured at '{settings.API_PREFIX}/health'.")

# --- Phase 5: Static Files & SPA Support ---
import os
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi import HTTPException, Request # Ensure Request and HTTPException are imported

# Initialize mimetypes
mimetypes.init()

logger.info("Configuring static files and SPA support (Revised Approach)...")
try:
    # 1. Statikus fájlok kiszolgálása a /static URL alól
    #    settings.PATHS.STATIC_DIR should correctly point to: .../Aevorex_codes/modules/financehub/frontend/static
    static_assets_physical_path = settings.PATHS.STATIC_DIR
    if isinstance(static_assets_physical_path, str): # Ensure it's a Path object
        static_assets_physical_path = Path(static_assets_physical_path)

    logger.info(f"!!!!!!!!!! DEBUG - Static assets physical path (from settings.PATHS.STATIC_DIR): {static_assets_physical_path}")
    
    resolved_static_path_exists = static_assets_physical_path.exists() and static_assets_physical_path.is_dir()
    logger.info(f"!!!!!!!!!! DEBUG - Resolved static assets physical path: {static_assets_physical_path.resolve() if resolved_static_path_exists else 'DOES NOT EXIST or IS NOT A DIRECTORY'}")

    if resolved_static_path_exists:
        app.mount(
            "/static",
            StaticFiles(directory=static_assets_physical_path),
            name="frontend_static_assets"
        )
        logger.info(f"Successfully mounted static assets directory '{static_assets_physical_path.resolve()}' at URL '/static'.")
    else:
        logger.error(f"!!!!!!!!!! CRITICAL DEBUG - Static assets directory FOR '/static' MOUNT NOT FOUND or is not a directory at: {static_assets_physical_path.resolve()} !!!!!!!!!!")
        # Assuming STATIC_ASSETS_CRITICAL logic applies
        logger.critical("Static assets directory is critical but not found. Halting application.")
        sys.exit(f"Application halted: Critical static assets directory not found at {static_assets_physical_path}")

    # 2. SPA támogatás: A financehub.html kiszolgálása
    #    settings.PATHS.PROJECT_ROOT should point to the modules/financehub directory
    project_root_for_spa = settings.PATHS.PROJECT_ROOT
    if isinstance(project_root_for_spa, str):
        project_root_for_spa = Path(project_root_for_spa)
    
    # Since we're in modules/financehub, the financehub.html is directly in frontend/financehub.html
    index_html_path = project_root_for_spa / "modules" / "financehub" / "frontend" / "financehub.html"  # Changed to financehub.html
    logger.info(f"!!!!!!!!!! DEBUG - SPA financehub.html path calculated as: {index_html_path}")
    
    resolved_index_html_exists = index_html_path.exists() and index_html_path.is_file()
    logger.info(f"!!!!!!!!!! DEBUG - Resolved SPA financehub.html path: {index_html_path.resolve() if resolved_index_html_exists else 'DOES NOT EXIST or IS NOT A FILE'}")

    def get_media_type(file_path: Path) -> str:
        """Get the appropriate media type for a file based on its extension."""
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if mime_type:
            return mime_type
        
        # Fallback for common file types
        suffix = file_path.suffix.lower()
        if suffix == '.css':
            return 'text/css'
        elif suffix == '.js':
            return 'application/javascript'
        elif suffix == '.html':
            return 'text/html'
        elif suffix == '.json':
            return 'application/json'
        else:
            return 'application/octet-stream'

    # IMPORTANT: Add SPA fallback AFTER all API routes to avoid conflicts
    # This ensures API routes take precedence over the catch-all SPA route
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        # This function serves as a catch-all for client-side SPA routing.
        # It first checks if a specific HTML file exists in the frontend directory,
        # and only falls back to SPA index.html if not found.
        
        # Skip API paths to avoid interference - use proper API prefix
        if full_path.startswith("api/v1/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Skip any static file requests (including prefixed ones like /healthhub/static/)
        if "/static/" in full_path or full_path.startswith("static/"):
            # Check if it's a direct static file request
            if full_path.startswith("static/"):
                # This would be handled by the mounted /static route
                raise HTTPException(status_code=404, detail="Static file not found")
            else:
                # This is a prefixed static request (e.g., /healthhub/static/...)
                # Extract the actual static path and try to serve it
                static_parts = full_path.split("/static/", 1)
                if len(static_parts) == 2:
                    static_file_path = static_parts[1]  # Get the part after /static/
                    actual_file_path = static_assets_physical_path / static_file_path
                    
                    if actual_file_path.exists() and actual_file_path.is_file():
                        media_type = get_media_type(actual_file_path)
                        return FileResponse(actual_file_path, media_type=media_type)
                    else:
                        raise HTTPException(status_code=404, detail="Static file not found")
                else:
                    raise HTTPException(status_code=404, detail="Invalid static path")
        
        logger.debug(f"SPA Fallback: Request for path '/{full_path}'. Attempting to serve SPA index: {index_html_path}")

        # Attempt to serve any auxiliary HTML file located alongside financehub.html
        if full_path.endswith('.html'):
            # Locate in the same directory as the SPA index (e.g. css_complete_debug_analysis.html)
            frontend_dir = index_html_path.parent  # .../modules/financehub/frontend
            specific_html_path = frontend_dir / full_path
            
            if specific_html_path.exists() and specific_html_path.is_file():
                logger.debug(f"Serving specific HTML file: {specific_html_path}")
                return FileResponse(specific_html_path, media_type="text/html")

        if resolved_index_html_exists: # Use the pre-checked status
            return FileResponse(index_html_path, media_type="text/html")
        else:
            logger.error(f"!!!!!!!!!! CRITICAL DEBUG - SPA financehub.html NOT FOUND at: {index_html_path.resolve()} during request handling !!!!!!!!!!")
            # This indicates a server configuration error if financehub.html is missing.
            raise HTTPException(status_code=500, detail="SPA entry point (financehub.html) not configured or found on server.")

    logger.info(f"SPA fallback configured to serve '{index_html_path.resolve() if resolved_index_html_exists else index_html_path}' for non-API/non-static routes.")

except AttributeError as path_config_error:
    # This error implies settings.PATHS or its sub-attributes are missing.
    logger.critical(f"CRITICAL CONFIGURATION ERROR: Missing path attributes in 'settings.PATHS'. Error: {path_config_error}", exc_info=True)
    sys.exit(f"Application halted: Critical configuration error for path settings: {path_config_error}")
except Exception as frontend_mount_error:
    # Generic catch-all for other issues during setup.
    logger.critical(f"CRITICAL FAILURE during frontend/static files setup: {frontend_mount_error}", exc_info=True)
    sys.exit(f"Application halted: Critical failure mounting frontend/static assets: {frontend_mount_error}")
# --- Phase 7: Development Server Execution ---
# This block allows running the server directly for local development.
# It is not used in production deployments (e.g., when using Gunicorn).
if __name__ == "__main__":
    logger.info("Attempting to start Uvicorn server directly (for local development)...")

    # Ensure uvicorn is available
    try:
        import uvicorn
    except ImportError:
        logger.critical("Uvicorn is not installed. Please run 'pip install uvicorn' to run the development server.")
        sys.exit("Uvicorn not found.")

    try:
        # CORRECTED: Use the designated and existing port setting
        UVICORN_PORT = settings.UVICORN.PORT 
        UVICORN_HOST = settings.UVICORN.HOST
        UVICORN_RELOAD = settings.UVICORN.RELOAD
        UVICORN_LOG_LEVEL = settings.UVICORN.LOG_LEVEL
        UVICORN_WORKERS = settings.UVICORN.WORKERS

        logger.info(
            f"Starting Uvicorn Development Server: "
            f"Host='{UVICORN_HOST}', Port={UVICORN_PORT}, Workers={UVICORN_WORKERS}, "
            f"Reload={UVICORN_RELOAD}, UvicornLogLevel='{UVICORN_LOG_LEVEL}'"
        )
        
        uvicorn.run(
            "main:app",  # app instance in the current file
            host=UVICORN_HOST,
            port=UVICORN_PORT,
            reload=UVICORN_RELOAD,
            log_level=UVICORN_LOG_LEVEL.lower(), # Ensure it is lowercase
            workers=UVICORN_WORKERS,
        )
        
    except AttributeError as e:
        logger.critical(f"A critical error occurred while trying to start the Uvicorn server: {e}", exc_info=True)
        print(f"Uvicorn server startup failed: {e}", file=sys.stderr)
    except Exception as e:
        logger.critical(f"An unexpected error occurred during Uvicorn startup: {e}", exc_info=True)
        print(f"An unexpected error occurred: {e}", file=sys.stderr)

logger.info(f"--- {settings.APP_META.TITLE} v{settings.APP_META.VERSION} setup sequence completed. ---")