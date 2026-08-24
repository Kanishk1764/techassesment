import logging
from typing import List, Dict, Any
from ...config import settings
from .base import LlmProvider, EvaluationResult
from .openai_provider import OpenAiProvider
from .mock_provider import MockProvider

logger = logging.getLogger(__name__)

_provider_instance: LlmProvider = None
_active_provider_name: str = "openai"
_active_model_name: str = "gpt-4o-mini"

AVAILABLE_MODELS = [
    {
        "id": "gpt-4o-mini",
        "name": "OpenAI GPT-4o-mini",
        "description": "Fast & Cost-Optimized (Recommended for high throughput screening)",
        "isCostOptimized": True
    },
    {
        "id": "gpt-4o",
        "name": "OpenAI GPT-4o",
        "description": "High-Precision Deep Reasoning & Vision OCR (Flagship Multi-Modal)",
        "isCostOptimized": False
    }
]

def get_llm_provider() -> LlmProvider:
    global _provider_instance, _active_provider_name, _active_model_name
    if _provider_instance is not None:
        return _provider_instance

    has_key = bool(settings.openai_api_key and settings.openai_api_key.strip())

    if has_key:
        _active_model_name = settings.openai_model or "gpt-4o-mini"
        logger.info(f"Initializing OpenAI LLM Provider with model: {_active_model_name}")
        _provider_instance = OpenAiProvider(settings.openai_api_key, _active_model_name)
        _active_provider_name = "openai"
    else:
        logger.info("No explicit OPENAI_API_KEY detected in env; initializing Mock fallback.")
        _provider_instance = MockProvider()
        _active_provider_name = "mock"
        _active_model_name = "gpt-4o-mini"

    return _provider_instance

def set_active_model(model_name: str):
    global _provider_instance, _active_provider_name, _active_model_name
    model_name = model_name.strip()

    has_key = bool(settings.openai_api_key and settings.openai_api_key.strip())
    if not has_key:
        logger.warning("Cannot switch to OpenAI model without OPENAI_API_KEY. Operating on fallback.")
        _active_model_name = model_name
        return

    if isinstance(_provider_instance, OpenAiProvider):
        _provider_instance.set_model(model_name)
    else:
        _provider_instance = OpenAiProvider(settings.openai_api_key, model_name)
    
    _active_provider_name = "openai"
    _active_model_name = model_name
    logger.info(f"Active model switched to: {model_name}")

def set_llm_provider(provider: LlmProvider, name: str = "mock"):
    global _provider_instance, _active_provider_name, _active_model_name
    _provider_instance = provider
    _active_provider_name = name

def get_active_provider_name() -> str:
    global _active_provider_name
    if _provider_instance is None:
        get_llm_provider()
    return _active_provider_name

def get_active_model_name() -> str:
    global _active_model_name
    if _provider_instance is None:
        get_llm_provider()
    return _active_model_name

__all__ = [
    "LlmProvider", "EvaluationResult", "OpenAiProvider", "MockProvider",
    "get_llm_provider", "set_llm_provider", "set_active_model",
    "get_active_provider_name", "get_active_model_name", "AVAILABLE_MODELS"
]
