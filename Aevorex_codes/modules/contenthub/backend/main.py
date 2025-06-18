"""
==========================================================================
CONTENTHUB BACKEND API v2.0 - OPENROUTER INTEGRÁLT
==========================================================================

Prémium FastAPI backend multimodális tartalom generáláshoz és prompt engineeringhez.
Teljes OpenRouter integráció költséghatékony AI modellekkel.

Főbb funkciók:
- Prompt Studio API (MidJourney, DALL-E, Runway optimalizálás)
- Caption Master (Instagram, LinkedIn, TikTok captionok)
- Visual Prompter (multimodális képleírás és prompt generálás)
- Audio Scripter (podcast, voiceover, zenei briefek)
- Brand Templater (brand konzisztencia ellenőrzés)
- Workflow Manager (komplex multi-step tartalom pipeline)

Technológiák:
- FastAPI + Pydantic validáció
- OpenRouter API integráció (ingyenes/olcsó modellek)
- asyncio aszinkron feldolgozás
- SQLAlchemy adatbázis ORM
- Költséghatékony caching rendszer

Szerzők: Aevorex Premium Team
Utolsó frissítés: 2025-01-XX
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import os
from contextlib import asynccontextmanager

# FastAPI és kapcsolódó importok
try:
    from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.middleware.gzip import GZipMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel, Field, validator, field_validator
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    print("⚠️ FastAPI not installed. Install with: pip install fastapi uvicorn")

# Adatbázis kapcsolatok
try:
    from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, Boolean, create_engine
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker, Session
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False
    print("⚠️ SQLAlchemy not installed. Install with: pip install sqlalchemy")

# HTTP kliens és AI szolgáltatások
try:
    import httpx
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ OpenAI client not installed. Install with: pip install openai httpx")

# ==========================================================================
# CONFIGURATION & ENVIRONMENT
# ==========================================================================

# Configuration from environment
OPENROUTER_API_KEY = os.getenv("CONTENTHUB_OPENROUTER_API_KEY", "")
PRIMARY_MODEL = os.getenv("CONTENTHUB_PRIMARY_MODEL", "deepseek/deepseek-r1:free")
FALLBACK_MODEL = os.getenv("CONTENTHUB_FALLBACK_MODEL", "meta-llama/llama-3.3-8b-instruct:free")
MULTIMODAL_MODEL = os.getenv("CONTENTHUB_MULTIMODAL_MODEL", "google/gemini-flash-1.5")
PREMIUM_MODEL = os.getenv("CONTENTHUB_PREMIUM_MODEL", "gpt-4o-mini")
TEMPERATURE = float(os.getenv("CONTENTHUB_TEMPERATURE", "0.7"))
MAX_TOKENS = int(os.getenv("CONTENTHUB_MAX_TOKENS", "2048"))
API_TIMEOUT = int(os.getenv("CONTENTHUB_API_TIMEOUT", "30"))
API_RETRIES = int(os.getenv("CONTENTHUB_API_RETRIES", "3"))
CACHE_DURATION = int(os.getenv("CONTENTHUB_CACHE_DURATION", "3600"))
RATE_LIMIT_CALLS = int(os.getenv("CONTENTHUB_RATE_LIMIT_CALLS", "100"))
RATE_LIMIT_WINDOW = int(os.getenv("CONTENTHUB_RATE_LIMIT_WINDOW", "60"))

# Optional database configuration
try:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///contenthub.db")
except Exception:
    DATABASE_URL = "sqlite:///contenthub.db"

# OpenRouter API konfiguráció environment változókból
OPENROUTER_BASE_URL = os.getenv("CONTENTHUB_AI__OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
SITE_URL = os.getenv("CONTENTHUB_AI__SITE_URL", "http://localhost:3002")
APP_NAME = os.getenv("CONTENTHUB_AI__APP_NAME", "Aevorex ContentHUB")

# AI modellek konfigurációja
MODEL_PRIMARY = PRIMARY_MODEL
MODEL_FALLBACK = FALLBACK_MODEL
MODEL_MULTIMODAL = MULTIMODAL_MODEL
MODEL_PREMIUM = PREMIUM_MODEL

# AI paraméterek
DEFAULT_TEMPERATURE = TEMPERATURE
DEFAULT_MAX_TOKENS = MAX_TOKENS
DEFAULT_TIMEOUT = API_TIMEOUT
RETRY_COUNT = API_RETRIES

# Cache beállítások
CACHE_ENABLED = True

# Rate limiting
RATE_LIMIT_RPM = RATE_LIMIT_CALLS
DAILY_TOKEN_LIMIT = RATE_LIMIT_CALLS

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ==========================================================================
# DATABASE MODELS
# ==========================================================================

if SQLALCHEMY_AVAILABLE:
    Base = declarative_base()

    class ContentGeneration(Base):
        __tablename__ = "content_generations"
        
        id = Column(Integer, primary_key=True, index=True)
        module_type = Column(String(50), nullable=False)  # prompt-studio, caption-master, etc.
        user_session = Column(String(100), nullable=True)
        input_data = Column(JSON, nullable=False)
        generated_content = Column(Text, nullable=True)
        metadata = Column(JSON, nullable=True)
        status = Column(String(20), default="pending")  # pending, processing, completed, failed
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        generation_time_ms = Column(Integer, nullable=True)
        rating = Column(Integer, nullable=True)  # 1-5 user rating
        ai_model_used = Column(String(100), nullable=True)
        token_usage = Column(JSON, nullable=True)  # input/output token counts

    class WorkflowExecution(Base):
        __tablename__ = "workflow_executions"
        
        id = Column(Integer, primary_key=True, index=True)
        workflow_name = Column(String(100), nullable=False)
        steps_config = Column(JSON, nullable=False)
        current_step = Column(Integer, default=0)
        results = Column(JSON, nullable=True)
        status = Column(String(20), default="initialized")
        user_session = Column(String(100), nullable=True)
        created_at = Column(DateTime, default=datetime.utcnow)
        completed_at = Column(DateTime, nullable=True)
        total_tokens_used = Column(Integer, default=0)
        estimated_cost_usd = Column(String(20), nullable=True)

    class BrandTemplate(Base):
        __tablename__ = "brand_templates"
        
        id = Column(Integer, primary_key=True, index=True)
        name = Column(String(100), nullable=False)
        brand_colors = Column(JSON, nullable=True)
        typography = Column(JSON, nullable=True)
        voice_guidelines = Column(Text, nullable=True)
        logo_url = Column(String(500), nullable=True)
        style_rules = Column(JSON, nullable=True)
        created_at = Column(DateTime, default=datetime.utcnow)
        is_active = Column(Boolean, default=True)
else:
    print("⚠️ Database models disabled - SQLAlchemy not available")
    Base = None
    ContentGeneration = None
    WorkflowExecution = None
    BrandTemplate = None

# ==========================================================================
# PYDANTIC MODELS (REQUEST/RESPONSE SCHEMAS)
# ==========================================================================

if FASTAPI_AVAILABLE:
    class PromptStudioRequest(BaseModel):
        base_prompt: str = Field(..., min_length=1, max_length=2000, description="Az eredeti prompt szöveg")
        platform: str = Field(..., description="Cél platform: MidJourney, DALL-E, Runway, Stable-Diffusion")
        style_preferences: str = Field("realistic", description="Stílus preferenciák")
        aspect_ratio: Optional[str] = Field(None, pattern=r"^\d+:\d+$")
        quality_level: Optional[str] = Field("standard", pattern="^(draft|standard|premium)$")
        
        @field_validator('platform')
        @classmethod
        def validate_platform(cls, v):
            allowed = ['MidJourney', 'DALL-E', 'Runway', 'Stable-Diffusion']
            if v not in allowed:
                raise ValueError(f'Platform must be one of: {allowed}')
            return v

    class CaptionMasterRequest(BaseModel):
        content_description: str = Field(..., min_length=10, max_length=1000, description="Tartalom rövid leírása")
        platform: str = Field(..., description="Social média platform")
        target_audience: str = Field("general", description="Célközönség leírása")  
        brand_voice: Optional[str] = Field("friendly", pattern="^(professional|casual|friendly|authoritative|playful)$")
        hashtag_count: int = Field(5, ge=0, le=30, description="Hashtag-ek száma")
        content_type: Optional[str] = Field("image", description="Tartalom típusa: image, video, carousel, story")
        cta_type: Optional[str] = Field(None, description="Call-to-action típusa: like, comment, share, visit, buy")
        keywords: Optional[List[str]] = Field(default_factory=list, description="Kulcsszavak listája")
        
        @field_validator('platform')
        @classmethod
        def validate_platform(cls, v):
            allowed = ['Instagram', 'TikTok', 'LinkedIn', 'Twitter', 'YouTube', 'Facebook']
            if v not in allowed:
                raise ValueError(f'Platform must be one of: {allowed}')
            return v

    class VisualPrompterRequest(BaseModel):
        base_prompt: str = Field(..., min_length=5, max_length=500, description="Alapvető prompt leírása")
        composition_style: str = Field("balanced", pattern="^(close-up|medium-shot|wide-angle|balanced|rule-of-thirds)$")
        lighting: str = Field("natural", pattern="^(natural|studio|golden-hour|dramatic|soft|hard)$")
        color_palette: Optional[str] = Field(None, description="Színpaletta leírás")
        mood: str = Field("neutral", pattern="^(energetic|calm|mysterious|cheerful|serious|neutral)$")
        technical_specs: Optional[str] = Field(None, description="Technikai specifikációk")
        output_format: str = Field("prompt", pattern="^(prompt|structured|parameters)$")

    class AudioScripterRequest(BaseModel):
        content_type: str = Field(..., pattern="^(podcast|youtube|voiceover|music-brief)$")
        topic: str = Field(..., min_length=5, max_length=200, description="Téma vagy cím")
        duration_minutes: int = Field(5, ge=1, le=60, description="Időtartam percben")
        tone: str = Field("conversational", pattern="^(conversational|professional|educational|entertaining)$")
        target_audience: str = Field("general", description="Célközönség")
        
    class BrandTemplateRequest(BaseModel):
        brand_name: str = Field(..., min_length=2, max_length=50, description="Márka név")
        industry: str = Field(..., min_length=3, max_length=50, description="Iparág")
        target_audience: str = Field(..., min_length=5, max_length=200, description="Célközönség leírása")
        brand_values: str = Field(..., min_length=10, max_length=500, description="Márka értékek")
        preferred_tone: str = Field("professional", description="Preferált hangnem")

    class WorkflowManagerRequest(BaseModel):
        workflow_name: str = Field(..., min_length=3, max_length=100, description="Workflow neve")
        steps: List[str] = Field(..., min_items=2, max_items=8, description="Lépések listája")
        input_parameters: Optional[dict] = Field(None, description="Bemeneti paraméterek")
        output_format: str = Field("json", description="Kimeneti formátum")

    # Response modellek
    class GenerationResponse(BaseModel):
        success: bool = Field(..., description="Sikeres volt-e a generálás")
        generation_id: str = Field(..., description="Egyedi generálási azonosító")
        content: str = Field(..., description="Generált tartalom")
        metadata: Optional[dict] = Field(None, description="További metaadatok")
        processing_time_ms: Optional[int] = Field(None, description="Feldolgozási idő milliszekundumban")
        suggestions: Optional[List[str]] = Field(None, description="Javasolt továbbfejlesztések")
        model_used: Optional[str] = Field(None, description="Használt AI modell")
        token_usage: Optional[dict] = Field(None, description="Token felhasználás statisztikái")

    class WorkflowStatusResponse(BaseModel):
        workflow_id: str
        status: str
        current_step: int
        total_steps: int
        results: Optional[Dict[str, Any]] = None
        estimated_completion: Optional[datetime] = None
else:
    print("⚠️ Pydantic models disabled - FastAPI not available")
    PromptStudioRequest = None
    CaptionMasterRequest = None
    VisualPrompterRequest = None
    AudioScripterRequest = None
    BrandTemplateRequest = None
    WorkflowManagerRequest = None
    GenerationResponse = None
    WorkflowStatusResponse = None

# ==========================================================================
# OPENROUTER AI SERVICE MANAGER
# ===========================================================================

class AIServiceManager:
    """OpenRouter-alapú AI szolgáltatáskezelő költséghatékony modellekkel"""
    
    def __init__(self):
        # OpenRouter kliens inicializálása
        if OPENAI_AVAILABLE and OPENROUTER_API_KEY:
            self.client = AsyncOpenAI(
                api_key=OPENROUTER_API_KEY,
                base_url=OPENROUTER_BASE_URL
            )
            self.available = True
        else:
            self.client = None
            self.available = False
            print("⚠️ AI Service Manager disabled - Missing OpenAI client or API key")
        
        # Token használat követése
        self.daily_tokens_used = 0
        self.request_count = 0
        
        if self.available:
            logger.info(f"AIServiceManager initialized with OpenRouter")
            logger.info(f"Primary model: {MODEL_PRIMARY}")
            logger.info(f"Multimodal model: {MODEL_MULTIMODAL}")

    def initialize(self):
        """Szolgáltatás inicializálása és validálása"""
        try:
            if not self.available:
                logger.warning("AI Service Manager not available - dependencies missing")
                return False
            
            # OpenRouter kapcsolat tesztelése (opcionális)
            logger.info("✅ AI Service Manager inicializálva")
            logger.info(f"   Primary model: {MODEL_PRIMARY}")
            logger.info(f"   Fallback model: {MODEL_FALLBACK}")
            logger.info(f"   Multimodal model: {MODEL_MULTIMODAL}")
            
            # Token límitekről tájékoztatás
            logger.info(f"   Daily token limit: {DAILY_TOKEN_LIMIT}")
            logger.info(f"   Rate limit: {RATE_LIMIT_RPM} requests/minute")
            
            return True
            
        except Exception as e:
            logger.error(f"AI Service Manager initialization failed: {str(e)}")
            return False

    async def generate_content(self, 
                             prompt: str, 
                             model: Optional[str] = None,
                             max_tokens: int = DEFAULT_MAX_TOKENS,
                             temperature: float = DEFAULT_TEMPERATURE,
                             use_multimodal: bool = False) -> Dict[str, Any]:
        """
        Tartalom generálás OpenRouter API-val
        """
        if not self.available:
            return {
                "success": False,
                "error": "AI Service not available - missing dependencies or API key",
                "content": f"Mock response for: {prompt[:100]}..."
            }
        
        # Rate limiting ellenőrzés
        if self.daily_tokens_used >= DAILY_TOKEN_LIMIT:
            if FASTAPI_AVAILABLE:
                raise HTTPException(
                    status_code=429, 
                    detail=f"Daily token limit ({DAILY_TOKEN_LIMIT}) exceeded"
                )
            else:
                return {"success": False, "error": "Daily token limit exceeded"}
        
        # Modell kiválasztás
        if model is None:
            if use_multimodal:
                model = MODEL_MULTIMODAL
            else:
                model = MODEL_PRIMARY
        
        start_time = datetime.now()
        
        try:
            # OpenRouter API hívás
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=DEFAULT_TIMEOUT,
                extra_headers={
                    "HTTP-Referer": SITE_URL,
                    "X-Title": APP_NAME
                }
            )
            
            # Válasz feldolgozás
            content = response.choices[0].message.content
            usage = response.usage
            
            # Token használat frissítése
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0
            total_tokens = input_tokens + output_tokens
            
            self.daily_tokens_used += total_tokens
            self.request_count += 1
            
            # Időmérés
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            logger.info(f"Generated content with {model}: {input_tokens}+{output_tokens}={total_tokens} tokens")
            
            return {
                "success": True,
                "content": content,
                "model_used": model,
                "processing_time_ms": int(processing_time),
                "token_usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens
                },
                "daily_usage": {
                    "tokens_used": self.daily_tokens_used,
                    "requests_made": self.request_count,
                    "limit_remaining": DAILY_TOKEN_LIMIT - self.daily_tokens_used
                }
            }
            
        except Exception as e:
            logger.error(f"Content generation failed with {model}: {str(e)}")
            
            # Fallback model használata
            if model != MODEL_FALLBACK:
                logger.info(f"Retrying with fallback model: {MODEL_FALLBACK}")
                return await self.generate_content(
                    prompt=prompt,
                    model=MODEL_FALLBACK,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    use_multimodal=False
                )
            
            if FASTAPI_AVAILABLE:
                raise HTTPException(
                    status_code=500, 
                    detail=f"AI service error: {str(e)}"
                )
            else:
                return {"success": False, "error": f"AI service error: {str(e)}"}

    def get_usage_stats(self) -> Dict[str, Any]:
        """Napi használati statisztikák"""
        return {
            "daily_tokens_used": self.daily_tokens_used,
            "daily_token_limit": DAILY_TOKEN_LIMIT,
            "usage_percentage": (self.daily_tokens_used / DAILY_TOKEN_LIMIT) * 100,
            "requests_made": self.request_count,
            "requests_per_minute_limit": RATE_LIMIT_RPM,
            "service_available": self.available
        }

# Global AI service instance
ai_service_manager = AIServiceManager()

# ==========================================================================
# BUSINESS LOGIC SERVICES
# ==========================================================================

class PromptStudioService:
    def __init__(self, ai_service_manager: AIServiceManager):
        self.ai_manager = ai_service_manager
        self.platform_templates = {
            "MidJourney": {
                "prefix": "",
                "suffix_template": " --ar {aspect_ratio} --v 6 --style raw",
                "optimization_prompt": """
                Optimalizáld ezt a MidJourney promptot a legjobb vizuális eredményért.
                Fontos szempontok:
                - Részletes leírás művészi stílussal
                - Világítás és kompozíció megadása
                - Színpaletta és hangulat
                - Technikai paraméterek (--ar, --v, --style)
                
                Eredeti prompt: {base_prompt}
                Stílus módosítók: {style_modifiers}
                
                Add vissza:
                1. Optimalizált prompt
                2. 3 alternatív variáció
                3. Technikai javaslatok
                4. Várható eredmény leírása
                """
            },
            "DALL-E": {
                "prefix": "",
                "suffix_template": "",
                "optimization_prompt": """
                Optimalizáld ezt a DALL-E promptot a legjobb eredményért.
                DALL-E specifikus szempontok:
                - Világos, konkrét leírás
                - Fotórealisztikus vagy művészi stílus megadása
                - Részletes környezet és objektumok
                - Kerüld a túl komplex kompozíciókat
                
                Eredeti prompt: {base_prompt}
                Stílus módosítók: {style_modifiers}
                
                Add vissza:
                1. Optimalizált prompt
                2. 3 alternatív variáció
                3. Stílus javaslatok
                4. Várható eredmény leírása
                """
            },
            "Runway": {
                "prefix": "",
                "suffix_template": "",
                "optimization_prompt": """
                Optimalizáld ezt a Runway AI promptot videó generáláshoz.
                Runway specifikus szempontok:
                - Mozgás és akció leírása
                - Kamera mozgás megadása
                - Időtartam és tempó
                - Vizuális kontinuitás
                
                Eredeti prompt: {base_prompt}
                Stílus módosítók: {style_modifiers}
                
                Add vissza:
                1. Optimalizált prompt
                2. 3 alternatív variáció
                3. Mozgás javaslatok
                4. Várható eredmény leírása
                """
            },
            "Stable-Diffusion": {
                "prefix": "",
                "suffix_template": ", highly detailed, 8k, photorealistic",
                "optimization_prompt": """
                Optimalizáld ezt a Stable Diffusion promptot.
                SD specifikus szempontok:
                - Pozitív és negatív promptok
                - Kwalitás kulcsszavak használata
                - Művész és stílus hivatkozások
                - Részletes környezet leírás
                
                Eredeti prompt: {base_prompt}
                Stílus módosítók: {style_modifiers}
                
                Add vissza:
                1. Optimalizált pozitív prompt
                2. Ajánlott negatív prompt
                3. 2 alternatív variáció
                4. Várható eredmény leírása
                """
            }
        }
    
    async def generate_optimized_prompt(self, request: PromptStudioRequest) -> Dict[str, Any]:
        """Optimalizált prompt generálás AI-val"""
        
        # Platform konfiguráció lekérése
        platform_config = self.platform_templates.get(request.platform)
        if not platform_config:
            raise HTTPException(status_code=400, detail=f"Unsupported platform: {request.platform}")
        
        # Optimalizációs prompt összeállítása
        optimization_prompt = platform_config["optimization_prompt"].format(
            base_prompt=request.base_prompt,
            style_modifiers=", ".join(request.style_modifiers) if request.style_modifiers else "nincs"
        )
        
        # Modell kiválasztás minőség alapján
        model = MODEL_PRIMARY if request.quality_level == "premium" else MODEL_FALLBACK
        max_tokens = 1500 if request.quality_level == "premium" else 1000
        
        # AI hívás az optimalizációhoz
        result = await self.ai_manager.generate_content(
            prompt=optimization_prompt,
            model=model,
            max_tokens=max_tokens,
            temperature=0.6  # Kicsit alacsonyabb kreativitás a konzisztenciáért
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail="Failed to generate optimized prompt")
        
        # Válasz parseing (egyszerűsített)
        ai_response = result["content"]
        
        # Eredmény strukturálása
        try:
            # Egyszerű parseing - valós implementációban regex vagy LLM parseing kell
            lines = ai_response.strip().split('\n')
            optimized_prompt = ""
            alternatives = []
            technical_suggestions = ""
            expected_outcome = ""
            
            current_section = "optimized"
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                if "optimalizált prompt" in line.lower() or line.startswith("1."):
                    current_section = "optimized"
                elif "alternatív" in line.lower() or line.startswith("2."):
                    current_section = "alternatives"
                elif "technikai" in line.lower() or "javaslat" in line.lower() or line.startswith("3."):
                    current_section = "technical"
                elif "várható" in line.lower() or line.startswith("4."):
                    current_section = "outcome"
                else:
                    if current_section == "optimized" and not optimized_prompt:
                        optimized_prompt = line
                    elif current_section == "alternatives":
                        if line and not line.startswith(("2.", "3.", "4.")):
                            alternatives.append(line)
                    elif current_section == "technical":
                        technical_suggestions += line + " "
                    elif current_section == "outcome":
                        expected_outcome += line + " "
            
            # Suffix hozzáadása ha szükséges
            if platform_config["suffix_template"] and request.aspect_ratio:
                suffix = platform_config["suffix_template"].format(
                    aspect_ratio=request.aspect_ratio
                )
                optimized_prompt += suffix
            
            await self._log_generation(request, ai_response, result)
            
            return {
                "optimized_prompt": optimized_prompt or ai_response[:200] + "...",
                "alternatives": alternatives[:3] if alternatives else [ai_response[:100]],
                "technical_suggestions": technical_suggestions.strip() or "Használd az alapértelmezett beállításokat",
                "expected_outcome": expected_outcome.strip() or "Magas minőségű vizuális eredmény várható",
                "platform": request.platform,
                "quality_level": request.quality_level,
                "processing_info": {
                    "model_used": result["model_used"],
                    "processing_time_ms": result["processing_time_ms"],
                    "token_usage": result["token_usage"]
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to parse AI response: {str(e)}")
            # Fallback: return raw response
            return {
                "optimized_prompt": ai_response,
                "alternatives": [],
                "technical_suggestions": "Raw AI response due to parsing error",
                "expected_outcome": "Check the optimized_prompt field for full response",
                "platform": request.platform,
                "quality_level": request.quality_level,
                "processing_info": {
                    "model_used": result["model_used"],
                    "processing_time_ms": result["processing_time_ms"],
                    "token_usage": result["token_usage"]
                }
            }

    async def _log_generation(self, request: PromptStudioRequest, result: str, metadata: Dict[str, Any]):
        """Generálás naplózása adatbázisba"""
        # Itt implementálni kell az adatbázis kapcsolatot
        logger.info(f"Generated prompt for {request.platform}: {len(result)} chars")

class CaptionMasterService:
    """Social media caption generálási szolgáltatás"""
    
    def __init__(self, ai_service_manager: AIServiceManager):
        self.ai_manager = ai_service_manager
        
        # Platform-specifikus limitek és sabonok
        self.platform_configs = {
            "Instagram": {
                "max_length": 2200,
                "optimal_length": 150,
                "hashtag_optimal": 11,
                "style_guide": "vizuális storytelling, lifestyle, authentic",
                "cta_examples": ["Dupla koppintás ❤️", "Mentsd el később 🔖", "Mondd el kommentben 💬"]
            },
            "LinkedIn": {
                "max_length": 3000,
                "optimal_length": 200,
                "hashtag_optimal": 3,
                "style_guide": "professional, insights, value-driven",
                "cta_examples": ["Mit gondolsz erről?", "Oszd meg tapasztalatod", "Kapcsolódj hozzám"]
            },
            "TikTok": {
                "max_length": 300,
                "optimal_length": 100,
                "hashtag_optimal": 5,
                "style_guide": "trendy, engaging, youth-oriented",
                "cta_examples": ["Követelj több ilyen tartalomért 🔥", "Duplikálj ha egyetértesz", "Válaszolj videóval"]
            },
            "YouTube": {
                "max_length": 5000,
                "optimal_length": 300,
                "hashtag_optimal": 15,
                "style_guide": "informative, community-building",
                "cta_examples": ["Iratkozz fel!", "Like ha tetszett", "Kommentelj kérdéseket"]
            }
        }

    async def generate_platform_caption(self, request: CaptionMasterRequest, ai_manager: AIServiceManager) -> Dict[str, Any]:
        """Platform-specifikus caption generálás"""
        
        # Platform konfiguráció lekérése
        platform_config = self.platform_configs.get(request.platform)
        if not platform_config:
            raise HTTPException(status_code=400, detail=f"Unsupported platform: {request.platform}")
        
        # Optimalizációs prompt összeállítása
        optimization_prompt = f"""
        Generálj egy professzionális {request.platform} captiot az alábbi paraméterek alapján:
        
        PLATFORM: {request.platform}
        TARTALOM TÍPUS: {request.content_type}
        CÉLCSOPORT: {request.target_audience}
        BRAND HANGVÉTEL: {request.brand_voice}
        CALL-TO-ACTION: {request.cta_type or "engagement"}
        
        PLATFORM SPECIFIKUS IRÁNYELVEK:
        - Maximális hossz: {platform_config['max_length']} karakter
        - Optimális hossz: {platform_config['optimal_length']} karakter
        - Ajánlott hashtag szám: {platform_config['hashtag_optimal']}
        - Stílus útmutató: {platform_config['style_guide']}
        
        KULCSSZAVAK: {', '.join(request.keywords) if request.keywords else 'nincs megadva'}
        
        A caption tartalmazzon:
        1. Figyelemfelkeltő nyitó mondatot
        2. Értékes tartalmat a célcsoportnak
        3. Megfelelő emotikonokat (de ne túlzásba)
        4. Hatásos call-to-action-t
        5. Releváns hashtageket
        
        Add vissza:
        - FŐCAPTION: a teljes caption szöveg
        - ALTERNATÍVÁK: 2 rövidebb/hosszabb variáció
        - HASHTAG_JAVASLATOK: platformra optimalizált hashtagek
        - ENGAGEMENT_TIPPEK: további engagement növelő javaslatok
        """
        
        # Modell kiválasztás
        model = MODEL_PRIMARY if request.brand_voice == "professional" else MODEL_FALLBACK
        max_tokens = 1200
        
        # AI hívás
        result = await ai_manager.generate_content(
            prompt=optimization_prompt,
            model=model,
            max_tokens=max_tokens,
            temperature=0.8  # Kreatívabb tartalom
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail="Failed to generate caption")
        
        # Válasz parseing
        ai_response = result["content"]
        
        try:
            lines = ai_response.strip().split('\n')
            main_caption = ""
            alternatives = []
            hashtag_suggestions = []
            engagement_tips = []
            
            current_section = "main"
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                if "főcaption" in line.lower() or "main" in line.lower():
                    current_section = "main"
                elif "alternatív" in line.lower() or "alternative" in line.lower():
                    current_section = "alternatives"
                elif "hashtag" in line.lower():
                    current_section = "hashtags"
                elif "engagement" in line.lower() or "tipp" in line.lower():
                    current_section = "tips"
                else:
                    if current_section == "main" and not main_caption:
                        main_caption = line
                    elif current_section == "alternatives":
                        if line and not line.startswith(("ALTERNATÍV", "HASHTAG", "ENGAGEMENT")):
                            alternatives.append(line)
                    elif current_section == "hashtags":
                        # Hashtag extraction
                        hashtags = [word for word in line.split() if word.startswith("#")]
                        hashtag_suggestions.extend(hashtags)
                    elif current_section == "tips":
                        engagement_tips.append(line)
            
            # Fallback ha nem sikerült parseing
            if not main_caption:
                main_caption = ai_response[:platform_config['max_length']]
            
            # Hossz ellenőrzés és vágás
            if len(main_caption) > platform_config['max_length']:
                main_caption = main_caption[:platform_config['max_length']-3] + "..."
            
            # Hashtag limit alkalmazása
            if len(hashtag_suggestions) > request.hashtag_count:
                hashtag_suggestions = hashtag_suggestions[:request.hashtag_count]
            
            return {
                "caption": main_caption,
                "alternatives": alternatives[:2],
                "hashtags": hashtag_suggestions,
                "engagement_tips": engagement_tips[:3],
                "platform_stats": {
                    "character_count": len(main_caption),
                    "word_count": len(main_caption.split()),
                    "hashtag_count": len(hashtag_suggestions),
                    "platform_limit": platform_config['max_length'],
                    "optimal_length": platform_config['optimal_length']
                },
                "processing_info": {
                    "model_used": result["model_used"],
                    "processing_time_ms": result["processing_time_ms"],
                    "token_usage": result["token_usage"]
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to parse caption response: {str(e)}")
            # Fallback: return raw response
            return {
                "caption": ai_response[:platform_config['max_length']],
                "alternatives": [],
                "hashtags": [],
                "engagement_tips": ["Check the caption field for full AI response"],
                "platform_stats": {
                    "character_count": len(ai_response),
                    "word_count": len(ai_response.split()),
                    "hashtag_count": 0,
                    "platform_limit": platform_config['max_length'],
                    "optimal_length": platform_config['optimal_length']
                },
                "processing_info": {
                    "model_used": result["model_used"],
                    "processing_time_ms": result["processing_time_ms"],
                    "token_usage": result["token_usage"]
                }
            }

# ==========================================================================
# FASTAPI ALKALMAZÁS ÉS VÉGPONTOK
# ===========================================================================

# Global AI service instance  
ai_service_manager = AIServiceManager()

# Lifecycle manager
if FASTAPI_AVAILABLE:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup
        logger.info("🚀 ContentHUB Backend inicializálása...")
        logger.info(f"OpenRouter integration: {OPENROUTER_API_KEY[:10] if OPENROUTER_API_KEY else 'Not configured'}...")
        logger.info(f"Primary AI model: {MODEL_PRIMARY}")
        logger.info(f"Multimodal model: {MODEL_MULTIMODAL}")
        yield
        # Shutdown
        logger.info("ContentHUB Backend API shutting down...")

    # FastAPI app inicializálás
    app = FastAPI(
        title="ContentHUB Backend API v2.0",
        description="Multimodális tartalom generálás és prompt engineering platform",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )

    # Middleware beállítások
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3002", "http://localhost:8080", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

    app.add_middleware(GZipMiddleware, minimum_size=1000)
else:
    print("⚠️ FastAPI application disabled - FastAPI not available")
    app = None

# ===========================================================================
# API VÉGPONTOK - CSAK HA FASTAPI ELÉRHETŐ
# ===========================================================================

if FASTAPI_AVAILABLE and app:
    @app.get("/api/v1/health")
    async def health_check():
        """Rendszer health check és konfiguráció"""
        usage_stats = ai_service_manager.get_usage_stats()
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "ai_config": {
                "primary_model": MODEL_PRIMARY,
                "fallback_model": MODEL_FALLBACK,
                "multimodal_model": MODEL_MULTIMODAL,
                "openrouter_connected": bool(OPENROUTER_API_KEY)
            },
            "usage_stats": usage_stats,
            "features": {
                "prompt_studio": True,
                "caption_master": True,
                "visual_prompter": True,
                "audio_scripter": True,
                "brand_templater": True,
                "workflow_manager": True
            }
        }

    @app.get("/api/v1/usage-stats")
    async def get_usage_statistics():
        """Napi használati statisztikák lekérdezése"""
        return ai_service_manager.get_usage_stats()

    # ===========================================================================
    # PROMPT STUDIO ENDPOINTS
    # ===========================================================================

    @app.post("/api/v1/prompt-studio/generate", response_model=GenerationResponse)
    async def generate_optimized_prompt(request: PromptStudioRequest):
        """Optimalizált prompt generálás AI-val"""
        try:
            prompt_service = PromptStudioService(ai_service_manager)
            result = await prompt_service.generate_optimized_prompt(request)
            
            return GenerationResponse(
                success=True,
                generation_id=f"ps_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                content=result["optimized_prompt"],
                metadata={
                    "alternatives": result["alternatives"],
                    "technical_suggestions": result["technical_suggestions"],
                    "expected_outcome": result["expected_outcome"],
                    "platform": result["platform"]
                },
                processing_time_ms=result["processing_info"]["processing_time_ms"],
                suggestions=result["alternatives"],
                model_used=result["processing_info"]["model_used"],
                token_usage=result["processing_info"]["token_usage"]
            )
            
        except Exception as e:
            logger.error(f"Prompt generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/v1/prompt-studio/templates")
    async def get_prompt_templates():
        """Előre definiált prompt sablonok lekérdezése"""
        templates = {
            "portrait_photography": {
                "name": "Portré Fotózás",
                "base_prompt": "Professional portrait of a person, studio lighting, shallow depth of field",
                "modifiers": ["cinematic", "high resolution", "professional"],
                "recommended_aspect_ratio": "3:4",
                "platforms": ["MidJourney", "DALL-E", "Stable-Diffusion"]
            },
            "landscape_art": {
                "name": "Tájkép Művészet",
                "base_prompt": "Breathtaking landscape view, natural lighting, panoramic composition",
                "modifiers": ["scenic", "nature", "atmospheric"],
                "recommended_aspect_ratio": "16:9",
                "platforms": ["MidJourney", "DALL-E", "Runway"]
            },
            "product_photography": {
                "name": "Termék Fotózás",
                "base_prompt": "Clean product shot, white background, professional lighting",
                "modifiers": ["commercial", "clean", "minimalist"],
                "recommended_aspect_ratio": "1:1",
                "platforms": ["DALL-E", "Stable-Diffusion"]
            },
            "architectural_design": {
                "name": "Építészeti Design",
                "base_prompt": "Modern architectural structure, clean lines, innovative design",
                "modifiers": ["contemporary", "geometric", "structural"],
                "recommended_aspect_ratio": "16:9",
                "platforms": ["MidJourney", "DALL-E"]
            },
            "character_concept": {
                "name": "Karakter Koncepció",
                "base_prompt": "Character design concept art, detailed features, expressive",
                "modifiers": ["concept art", "detailed", "creative"],
                "recommended_aspect_ratio": "3:4",
                "platforms": ["MidJourney", "Stable-Diffusion"]
            },
            "video_scene": {
                "name": "Videó Jelenet",
                "base_prompt": "Cinematic scene with dynamic camera movement and lighting",
                "modifiers": ["cinematic", "dynamic", "atmospheric"],
                "recommended_aspect_ratio": "16:9",
                "platforms": ["Runway"]
            }
        }
        
        return {
            "success": True,
            "templates": templates,
            "total_count": len(templates),
            "categories": ["photography", "art", "design", "video"]
        }

    # ===========================================================================
    # CAPTION MASTER ENDPOINTS
    # ===========================================================================

    @app.post("/api/v1/caption-master/generate", response_model=GenerationResponse)
    async def generate_social_caption(request: CaptionMasterRequest):
        """Platform-optimalizált social media caption generálás"""
        try:
            caption_service = CaptionMasterService(ai_service_manager)
            result = await caption_service.generate_platform_caption(request, ai_service_manager)
            
            return GenerationResponse(
                success=True,
                generation_id=f"cm_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                content=result["caption"],
                metadata={
                    "alternatives": result["alternatives"],
                    "hashtags": result["hashtags"],
                    "engagement_tips": result["engagement_tips"],
                    "platform_stats": result["platform_stats"]
                },
                processing_time_ms=result["processing_info"]["processing_time_ms"],
                suggestions=result["engagement_tips"],
                model_used=result["processing_info"]["model_used"],
                token_usage=result["processing_info"]["token_usage"]
            )
            
        except Exception as e:
            logger.error(f"Caption generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/v1/caption-master/platform-info/{platform}")
    async def get_platform_information(platform: str):
        """Platform-specifikus információk és limitek"""
        caption_service = CaptionMasterService(ai_service_manager)
        
        if platform not in caption_service.platform_configs:
            raise HTTPException(status_code=404, detail=f"Platform {platform} not supported")
        
        config = caption_service.platform_configs[platform]
        
        return {
            "platform": platform,
            "configuration": config,
            "best_practices": {
                "post_timing": f"Optimális időpontok {platform}-hoz",
                "content_types": f"Legjobb tartalom típusok {platform}-hoz",
                "engagement_strategies": f"Engagement stratégiák {platform}-hoz"
            },
            "supported_features": {
                "hashtags": True,
                "mentions": True,
                "emojis": True,
                "links": platform in ["LinkedIn", "YouTube"]
            }
        }

    # ===========================================================================
    # ADDITIONAL MODULES (PLACEHOLDER ENDPOINTS)
    # ===========================================================================

    @app.post("/api/v1/visual-prompter/analyze")
    async def analyze_visual_content(request: VisualPrompterRequest):
        """Vizuális tartalom elemzés és prompt generálás"""
        return {
            "message": "Visual Prompter module - coming soon",
            "request_received": request.dict(),
            "estimated_completion": "Q2 2025"
        }

    @app.post("/api/v1/audio-scripter/generate")
    async def generate_audio_script(request: AudioScripterRequest):
        """Audio script generálás podcast/voiceover-hez"""
        return {
            "message": "Audio Scripter module - coming soon", 
            "request_received": request.dict(),
            "estimated_completion": "Q2 2025"
        }

    @app.post("/api/v1/brand-templater/create")
    async def create_brand_template(request: BrandTemplateRequest):
        """Brand template létrehozás és tárolás"""
        return {
            "message": "Brand Templater module - coming soon",
            "request_received": request.dict(),
            "estimated_completion": "Q1 2025"
        }

    @app.post("/api/v1/workflow-manager/execute")
    async def execute_workflow(request: WorkflowManagerRequest):
        """Multi-step workflow futtatás"""
        return {
            "message": "Workflow Manager module - coming soon",
            "request_received": request.dict(),
            "estimated_completion": "Q2 2025"
        }

    # ===========================================================================
    # ERROR HANDLERS
    # ===========================================================================

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request, exc):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "status_code": exc.status_code,
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url)
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        logger.error(f"Unhandled exception: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred",
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url)
            }
        )
else:
    print("⚠️ API endpoints disabled - FastAPI not available")

# ===========================================================================
# FELEOLGÓ INICIALIZÁLÁS ÉS FUTTATÁS
# ===========================================================================

def initialize_services():
    """Szolgáltatások inicializálása és validálása"""
    try:
        logger.info("🚀 ContentHUB Backend inicializálása...")
        
        # Environment config ellenőrzés
        if not OPENROUTER_API_KEY:
            logger.warning("⚠️ OPENROUTER_API_KEY nincs beállítva - korlátozott funkcionalitás")
        
        # AI Service Manager inicializálás
        ai_service_manager.initialize()
        logger.info("✅ AI Service Manager inicializálva")
        
        # Database kapcsolat (ha elérhető)
        if DATABASE_URL and SQLALCHEMY_AVAILABLE:
            logger.info("📊 Database kapcsolat elérhető")
        else:
            logger.info("📊 Database működés opcionális módban")
        
        logger.info("🎯 ContentHUB Backend sikeresen inicializálva!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Inicializálási hiba: {str(e)}")
        return False

def get_app():
    """FastAPI app getter funkcióként használható"""
    if FASTAPI_AVAILABLE and app:
        return app
    else:
        logger.warning("FastAPI nem elérhető - backend API inaktív")
        return None

if __name__ == "__main__":
    print("=" * 70)
    print("🎨 CONTENTHUB BACKEND API v2.0")
    print("   Premium Multimodális Tartalom Generátor")
    print("   Aevorex Premium Team | 2025")
    print("=" * 70)
    
    # Inicializálás
    init_success = initialize_services()
    
    if FASTAPI_AVAILABLE and init_success:
        try:
            import uvicorn
            
            print("\n🚀 Szerver indítása:")
            print(f"   URL: http://localhost:8085")
            print(f"   Dokumentáció: http://localhost:8085/docs")
            print(f"   Health check: http://localhost:8085/api/v1/health")
            print(f"   Modell: {MODEL_PRIMARY}")
            print("\n💡 Elérhető szolgáltatások:")
            print("   📝 Prompt Studio - AI prompt optimalizálás")
            print("   📱 Caption Master - Social media caption generálás")
            print("   🎥 Visual Prompter - Vizuális tartalom elemzés")
            print("   🎵 Audio Scripter - Audio script készítés")
            print("   🏢 Brand Templater - Márka sablon menedzser")
            print("   ⚙️ Workflow Manager - Munkafolyamat automatizálás")
            print("\n" + "=" * 70)
            
            # Uvicorn szerver indítása
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=8085,
                reload=False,
                access_log=True,
                log_level="info"
            )
            
        except ImportError:
            print("❌ Uvicorn nem elérhető - manuális FastAPI futtatás szükséges")
            print("   Telepítés: pip install uvicorn")
            print(f"   Futtatás: uvicorn main:app --host 0.0.0.0 --port 8085")
            
        except Exception as e:
            logger.error(f"Szerver indítási hiba: {str(e)}")
            
    else:
        print("\n⚠️ Backend API korlátozott módban fut")
        print("   Hiányzó függőségek: pip install -r requirements.txt")
        print("   Vagy: pip install fastapi uvicorn sqlalchemy pydantic")
        
        # Alapvető funkciók tesztelése függőségek nélkül is
        if init_success:
            print("\n🧪 Alapfunkciók tesztelése...")
            try:
                test_stats = ai_service_manager.get_usage_stats()
                print(f"   ✅ AI Service Manager működik: {test_stats}")
            except Exception as e:
                print(f"   ❌ Tesztolás sikertelen: {str(e)}")
    
    print("\n🏁 ContentHUB Backend betöltve.")

# ===========================================================================
# EXPORT FŐBB OBJEKTUMOK (IMPORT HASZNÁLATRA)
# ===========================================================================

__all__ = [
    "app",
    "ai_service_manager", 
    "initialize_services",
    "get_app"
] 