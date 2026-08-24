import logging
from datetime import datetime
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .database import engine, Base
from .routes import jobs, candidates
from .services.llm import (
    get_active_provider_name, get_active_model_name,
    get_llm_provider, set_active_model, AVAILABLE_MODELS
)
from .schemas import ModelSettingsRequest, ModelSettingsResponse, ModelOption

# Setup logging
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] [%(asctime)s] %(message)s")
logger = logging.getLogger(__name__)

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

# Initialize LLM provider
get_llm_provider()

app = FastAPI(
    title="TalentScan AI — AI Resume Screener Platform",
    description="Automated AI Resume Screening API with multi-modal document extraction, configurable weightage, and model switching",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized Error Handler
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    
    code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": str(exc.detail)}}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    msg = first_error.get("msg", "Invalid request body")
    loc = " -> ".join([str(l) for l in first_error.get("loc", [])])
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": {"code": "VALIDATION_ERROR", "message": f"{loc}: {msg}", "details": errors}}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected server error occurred."}}
    )

@app.get("/")
@app.head("/")
async def root():
    return {
        "status": "ok",
        "service": "TalentScan AI API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "llmProvider": get_active_provider_name(),
        "activeModel": get_active_model_name(),
    }

@app.get("/models", response_model=ModelSettingsResponse)
async def get_available_models():
    return ModelSettingsResponse(
        activeModel=get_active_model_name(),
        availableModels=[ModelOption(**m) for m in AVAILABLE_MODELS]
    )

@app.post("/settings/model", response_model=ModelSettingsResponse)
async def update_active_model(payload: ModelSettingsRequest):
    set_active_model(payload.model)
    return ModelSettingsResponse(
        activeModel=get_active_model_name(),
        availableModels=[ModelOption(**m) for m in AVAILABLE_MODELS]
    )

app.include_router(jobs.router)
app.include_router(candidates.router)
