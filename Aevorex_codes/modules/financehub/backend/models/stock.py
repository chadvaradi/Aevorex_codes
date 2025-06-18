# backend/models/stock.py (v3.8 - Robust Date Validation Unified)
# =============================================================================
# Pydantic Modellek a Részvényadatokhoz és API Válaszokhoz ("IBKR Szint")
#
# Felelősségek:
# - API válaszstruktúra pontos és robusztus definiálása.
# - Bejövő adatok (API válaszok, belső szótárak) szigorú validálása és típuskonverziója.
# - Adatkonzisztencia biztosítása a rendszer komponensei között.
# - Aliasok használata az API (pl. camelCase) és a belső kód (snake_case) közötti eltérések kezelésére.
# - Részletes validátorok a kritikus adatformátumokhoz és értékekhez.
# - Definíciós sorrend optimalizálása a függőségek miatt.
# - Új modellek (StockSplitData, DividendData) az EODHD adatokhoz.
# - Meglévő modellek (CompanyOverview, NewsItem, OHLCV) frissítése az új adatok és követelmények szerint.
# - Timestamp mezők egységesítése (Unix másodperc vagy milliszekundum, kontextustól függően).
# - Dátum validátorok egységesítése a nagyobb rugalmasságért.
# Verzió: 3.8 (Előző: 3.7 - ChartDataPoint Added, Minor Refinements)
# =============================================================================

import logging
import math  # NaN/Inf ellenőrzéshez
import re    # Regex validációhoz
from datetime import datetime as Datetime, date as Date, timezone, datetime as datetime # Explicit aliasok a Pylance és az olvashatóság kedvéért
from typing import List, Optional, Dict, Any, Union, Final

# Használjuk a Pydantic v2+ képességeit
from pydantic import (
    BaseModel, Field, HttpUrl, field_validator, model_validator, field_serializer,
    ConfigDict, ValidationError, ValidationInfo,
    StrictFloat, StrictInt, StrictStr, AwareDatetime
)

# --- Importáljuk a szükséges helper függvényeket ---
from modules.financehub.backend.utils.helpers import (
    _clean_value,
    parse_optional_float,
    parse_optional_int,
    parse_timestamp_to_iso_utc,
    _validate_date_string, # Főleg string->string dátum normalizáláshoz használatos
    parse_string_to_aware_datetime
)

# --- Logger Beállítása ---
logger = logging.getLogger("aevorex_finbot.models") # Konzisztens logger név

# --- Konstansok ---
DEFAULT_NA_VALUE: Final[str] = "N/A"
VALID_SENTIMENT_LABELS: Final[set[str]] = {
    "Positive", "Negative", "Neutral", "Somewhat-Positive", "Somewhat-Negative",
    "Bullish", "Bearish", "Somewhat-Bullish", "Somewhat-Bearish"
}


# ==========================================================
# === 1. Alapvető Függő Modellek ===
# (TickerSentiment, RatingPoint, StockSplitData, DividendData)
# ==========================================================

class TickerSentiment(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True, frozen=False)

    ticker: StrictStr = Field(..., description="Érintett tőzsdei szimbólum (automatán nagybetűsítve).")
    relevance_score: Optional[StrictFloat] = Field(default=None, ge=0.0, le=1.0)
    sentiment_score: Optional[StrictFloat] = Field(default=None, ge=-1.0, le=1.0)
    sentiment_label: Optional[StrictStr] = Field(default=None)

    @field_validator('ticker', mode='before')
    @classmethod
    def validate_and_normalize_ticker(cls, v: Any) -> str:
        cleaned_v = _clean_value(v)
        if not cleaned_v or not isinstance(cleaned_v, str):
            raise ValueError("Ticker symbol must be a non-empty string")
        if re.search(r"\s", cleaned_v):
            raise ValueError("Ticker symbol cannot contain whitespace")
        return cleaned_v.upper()

    @field_validator('relevance_score', 'sentiment_score', mode='before')
    @classmethod
    def parse_and_validate_score(cls, v: Any, info: ValidationInfo) -> Optional[float]:
        return parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")

    @field_validator('sentiment_label', mode='before')
    @classmethod
    def normalize_and_validate_label(cls, v: Any) -> Optional[str]:
        cleaned_v = _clean_value(v)
        if cleaned_v is None: return None
        normalized = str(cleaned_v).strip().replace('_', '-').replace(' ', '-').title()
        if not normalized: return None
        if normalized not in VALID_SENTIMENT_LABELS:
            logger.warning(
                f"Unexpected sentiment label: '{normalized}' in {cls.__name__} (Original: '{v}'). "
                f"It will be used as is. Valid labels are: {VALID_SENTIMENT_LABELS}"
            )
        return normalized


class RatingPoint(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra='ignore', validate_assignment=True)

    symbol: StrictStr = Field(..., description="Részvény szimbólum (nagybetűsítve).")
    date: Date = Field(..., description="Az értékelés dátuma.") # Kötelező mező

    rating_score: Optional[StrictInt] = Field(default=None, alias="ratingScore", ge=1, le=5)
    rating_recommendation: Optional[StrictStr] = Field(default=None, alias="ratingRecommendation")
    rating_details_dcf_score: Optional[StrictInt] = Field(None, alias="ratingDetailsDCFScore", ge=1, le=5)
    rating_details_dcf_recommendation: Optional[StrictStr] = Field(None, alias="ratingDetailsDCFRecommendation")
    rating_details_roe_score: Optional[StrictInt] = Field(None, alias="ratingDetailsROEScore", ge=1, le=5)
    rating_details_roe_recommendation: Optional[StrictStr] = Field(None, alias="ratingDetailsROERecommendation")
    rating_details_roa_score: Optional[StrictInt] = Field(None, alias="ratingDetailsROAScore", ge=1, le=5)
    rating_details_roa_recommendation: Optional[StrictStr] = Field(None, alias="ratingDetailsROARecommendation")
    rating_details_de_score: Optional[StrictInt] = Field(None, alias="ratingDetailsDEScore", ge=1, le=5)
    rating_details_de_recommendation: Optional[StrictStr] = Field(None, alias="ratingDetailsDERecommendation")
    rating_details_pe_score: Optional[StrictInt] = Field(None, alias="ratingDetailsPEScore", ge=1, le=5)
    rating_details_pe_recommendation: Optional[StrictStr] = Field(None, alias="ratingDetailsPERecommendation")
    rating_details_pb_score: Optional[StrictInt] = Field(None, alias="ratingDetailsPBScore", ge=1, le=5)
    rating_details_pb_recommendation: Optional[StrictStr] = Field(None, alias="ratingDetailsPBRecommendation")

    @field_validator('symbol', mode='before')
    @classmethod
    def validate_and_normalize_symbol(cls, v: Any) -> str:
        return TickerSentiment.validate_and_normalize_ticker(v)

    @field_validator('date', mode='before')
    @classmethod
    def validate_generic_date(cls, v: Any, info: ValidationInfo) -> Date:
        """
        Robosztus dátumvalidátor, ami Date objektumot ad vissza.
        Kezeli a Date, Datetime, Unix timestamp (int/float), és különböző ISO string formátumokat.
        Mivel a 'date' mező kötelező, hibát dob, ha a validáció sikertelen.
        """
        field_name = info.field_name
        class_name = cls.__name__

        if v is None:
            raise ValueError(f"Required date field '{field_name}' in {class_name} cannot be None.")
        if isinstance(v, Date):
            return v
        if isinstance(v, Datetime):
            return v.date()

        if isinstance(v, (int, float)):
            if not math.isfinite(v):
                raise ValueError(f"Non-finite (NaN/Inf) timestamp '{v}' for required field {field_name} in {class_name}.")
            try:
                dt_obj = Datetime.fromtimestamp(v, tz=timezone.utc)
                return dt_obj.date()
            except (OSError, ValueError, TypeError) as e:
                raise ValueError(f"Could not parse timestamp '{v}' to date for required field {field_name} in {class_name}: {e}")

        if isinstance(v, str):
            cleaned_str = _clean_value(v)
            if not cleaned_str:
                raise ValueError(f"Date string for required field {field_name} in {class_name} is empty after cleaning: '{v}'")
            try:
                # Kezeli YYYY-MM-DDTHH:MM:SSZ, YYYY-MM-DDTHH:MM:SS+zz:zz, stb.
                iso_str_for_dt = cleaned_str.replace('Z', '+00:00') if 'T' in cleaned_str and 'Z' in cleaned_str.upper() else cleaned_str
                dt_obj = Datetime.fromisoformat(iso_str_for_dt)
                return dt_obj.date()
            except ValueError:
                try: # Próbálkozás sima YYYY-MM-DD formátummal
                    return Date.fromisoformat(cleaned_str)
                except ValueError as e_iso:
                    raise ValueError(f"Invalid date string format for required field {field_name} in {class_name}: '{cleaned_str}'. Original error: {e_iso}")
        
        raise ValueError(f"Unhandled date type for required field {field_name} in {class_name}: {type(v)} ('{v}')")

    @field_validator(
        'rating_score', 'rating_details_dcf_score', 'rating_details_roe_score',
        'rating_details_roa_score', 'rating_details_de_score', 'rating_details_pe_score',
        'rating_details_pb_score', mode='before'
    )
    @classmethod
    def parse_and_validate_score_int(cls, v: Any, info: ValidationInfo) -> Optional[int]:
        return parse_optional_int(v, context=f"{cls.__name__}.{info.field_name}")

    @field_validator(
        'rating_recommendation', 'rating_details_dcf_recommendation', 'rating_details_roe_recommendation',
        'rating_details_roa_recommendation', 'rating_details_de_recommendation', 'rating_details_pe_recommendation',
        'rating_details_pb_recommendation', mode='before'
    )
    @classmethod
    def normalize_recommendation_str(cls, v: Any) -> Optional[str]:
        cleaned_v = _clean_value(v)
        if cleaned_v is None: return None
        normalized = str(cleaned_v).strip().replace('_', '-').replace(' ', '-').title()
        return normalized if normalized else None


class StockSplitData(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True)

    date: Date = Field(..., description="A split érvénybe lépésének napja (YYYY-MM-DD).")
    split_ratio_str: StrictStr = Field(..., description="A split aránya stringként (pl. '2:1', '1:10').")
    split_to: StrictFloat = Field(..., description="Az arány 'új' ('to') oldala (pl. 2.0).", gt=0)
    split_from: StrictFloat = Field(..., description="Az arány 'régi' ('from') oldala (pl. 1.0).", gt=0)

    @field_validator('date', mode='before')
    @classmethod
    def validate_split_date(cls, v: Any, info: ValidationInfo) -> Date:
        # A RatingPoint.date kötelező, így a validate_generic_date hibát dob, ha a parse sikertelen.
        # Ez megfelel a StockSplitData.date kötelező jellegének.
        return RatingPoint.validate_generic_date(v, info)

    @field_validator('split_ratio_str', mode='before')
    @classmethod
    def validate_split_ratio_str(cls, v: Any) -> str:
        cleaned_v = _clean_value(v)
        if not cleaned_v or not isinstance(cleaned_v, str):
            raise ValueError("Split ratio string must be a non-empty string.")
        if not re.fullmatch(r"^\d+(\.\d+)?:\d+(\.\d+)?$", cleaned_v):
            raise ValueError(f"Invalid split_ratio_str format: '{cleaned_v}'. Expected 'number:number'.")
        return cleaned_v

    @model_validator(mode='before')
    @classmethod
    def ensure_split_values_from_ratio_if_needed(cls, data: Any) -> Any:
        if isinstance(data, dict):
            ratio_str = data.get('split_ratio_str')
            has_to = 'split_to' in data and data['split_to'] is not None
            has_from = 'split_from' in data and data['split_from'] is not None

            if ratio_str and isinstance(ratio_str, str) and not (has_to and has_from):
                if re.fullmatch(r"^\d+(\.\d+)?:\d+(\.\d+)?$", ratio_str):
                    try:
                        to_val_str, from_val_str = ratio_str.split(':', 1)
                        to_val = float(to_val_str)
                        from_val = float(from_val_str)

                        if from_val == 0: raise ValueError("Split ratio 'from' value cannot be zero.")
                        if to_val <= 0 or from_val <= 0: raise ValueError("Split ratio values must be positive.")

                        if not has_to: data['split_to'] = to_val
                        if not has_from: data['split_from'] = from_val
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Could not parse split_to/split_from from split_ratio_str='{ratio_str}' for {cls.__name__}: {e}")
        return data

    @model_validator(mode='after')
    def check_ratio_consistency(self) -> 'StockSplitData':
        if self.split_from == 0: raise ValueError("Split ratio 'from' value cannot be zero.")
        
        calculated_ratio = self.split_to / self.split_from
        try:
            str_to, str_from = map(float, self.split_ratio_str.split(':'))
            if str_from == 0: raise ValueError("Split ratio string 'from' value cannot be zero in split_ratio_str.")
            string_based_ratio = str_to / str_from
            
            if not math.isclose(calculated_ratio, string_based_ratio, rel_tol=1e-9):
                logger.warning(
                    f"Inconsistent split ratio for date {self.date}: "
                    f"split_to/split_from ({self.split_to}/{self.split_from} = {calculated_ratio}) "
                    f"does not match split_ratio_str ('{self.split_ratio_str}' = {string_based_ratio})."
                )
        except (ValueError, TypeError):
             logger.error(f"Error comparing split ratios for date {self.date} with ratio string '{self.split_ratio_str}'.")
        return self


class DividendData(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True, populate_by_name=True)

    date: Date = Field(..., description="Ex-dividend dátum (YYYY-MM-DD).") # Kötelező
    dividend: StrictFloat = Field(..., description="Osztalék összege.", ge=0)
    currency: Optional[StrictStr] = Field(default=None, description="Az osztalék pénzneme (pl. 'USD').")
    unadjusted_value: Optional[StrictFloat] = Field(default=None, alias="unadjustedValue", ge=0)
    declaration_date: Optional[Date] = Field(default=None) # Opcionális
    record_date: Optional[Date] = Field(default=None)       # Opcionális
    payment_date: Optional[Date] = Field(default=None)      # Opcionális

    @field_validator('date', 'declaration_date', 'record_date', 'payment_date', mode='before')
    @classmethod
    def validate_dividend_dates(cls, v: Any, info: ValidationInfo) -> Optional[Date]:
        is_required_field = info.field_name == 'date'

        if v is None:
            if is_required_field:
                raise ValueError(f"Required field '{info.field_name}' cannot be None in {cls.__name__}")
            return None # Opcionális mező lehet None

        try:
            # RatingPoint.validate_generic_date hibát dob, ha nem tud parse-olni.
            # Ez a kötelező 'date' mezőnél megfelelő.
            # Opcionális mezőknél a try-except kezeli a hibát.
            return RatingPoint.validate_generic_date(v, info)
        except ValueError as e:
            if is_required_field:
                # Az eredeti hibát továbbadjuk, vagy egy specifikusabbat dobunk
                raise ValueError(f"Invalid date for required field '{info.field_name}' in {cls.__name__}: '{v}'. Original error: {e}")
            
            # Opcionális mezők esetén logolunk és None-t adunk vissza
            logger.warning(f"Invalid date format for optional field {info.field_name}: '{v}' in {cls.__name__}. Setting to None. Error: {e}")
            return None

    @field_validator('dividend', 'unadjusted_value', mode='before')
    @classmethod
    def parse_dividend_values(cls, v: Any, info: ValidationInfo) -> Optional[float]:
        val = parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")
        if val is not None and val < 0 and info.field_name == 'dividend': # Dividend cannot be negative
            raise ValueError(f"{info.field_name} cannot be negative in {cls.__name__}")
        return val

    @field_validator('currency', mode='before')
    @classmethod
    def clean_and_validate_currency(cls, v: Any) -> Optional[str]:
        cleaned = _clean_value(v)
        if cleaned is None: return None
        curr_str = str(cleaned).upper().strip()
        if not curr_str: return None
        if not re.fullmatch(r"^[A-Z]{3}$", curr_str):
            logger.warning(f"Potentially invalid currency format '{curr_str}' in {cls.__name__}. Original: '{v}'")
        return curr_str


# ==========================================================
# === 2. Strukturális Modellek (Hírek, Pénzügyek, Eredmények) ===
# ==========================================================

class NewsItem(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True, populate_by_name=True)

    uuid: StrictStr = Field(..., alias="source_unique_id", description="Egyedi azonosító (pl. API ID, URL hash).")
    title: StrictStr = Field(..., min_length=1)
    link: HttpUrl = Field(..., alias="article_url")
    publisher: StrictStr = Field(..., min_length=1, alias="source_name")
    published_at: Optional[AwareDatetime] = Field(default=None)
    content: Optional[StrictStr] = Field(default=None)
    summary: Optional[StrictStr] = Field(default=None)
    image_url: Optional[HttpUrl] = Field(default=None)
    source_api: Optional[StrictStr] = Field(default=None, alias="raw_data_provider")
    symbols: List[StrictStr] = Field(default_factory=list)
    overall_sentiment_score: Optional[StrictFloat] = Field(default=None, ge=-1.0, le=1.0)
    overall_sentiment_label: Optional[StrictStr] = Field(default=None)
    relevance_score: Optional[StrictFloat] = Field(default=None, ge=0.0, le=1.0)
    ticker_sentiment: List[TickerSentiment] = Field(default_factory=list)

    @field_validator('title', 'publisher', 'summary', 'content', 'source_api', mode='before')
    @classmethod
    def clean_news_strings(cls, v: Any, info: ValidationInfo) -> Optional[str]:
        cleaned = _clean_value(v)
        if info.field_name in ['title', 'publisher'] and not cleaned:
            raise ValueError(f"{info.field_name} cannot be empty for NewsItem.")
        return str(cleaned).strip() if cleaned is not None else None

    @field_validator('link', 'image_url', mode='before')
    @classmethod
    def clean_url_input(cls, v: Any, info: ValidationInfo) -> Optional[str]:
         cleaned = _clean_value(v, context=f"{cls.__name__}.{info.field_name}")
         return str(cleaned) if cleaned is not None else None

    @field_validator('published_at', mode='before')
    @classmethod
    def validate_and_parse_published_at(cls, v: Any) -> Optional[AwareDatetime]:
        if v is None: return None
        try:
            return parse_string_to_aware_datetime(v, context=f"{cls.__name__}.published_at")
        except ValueError as e:
            raise ValueError(f"Invalid format for {cls.__name__}.published_at: {v}. Error: {e}")

    @field_validator('overall_sentiment_score', 'relevance_score', mode='before')
    @classmethod
    def parse_score_floats(cls, v: Any, info: ValidationInfo) -> Optional[float]:
        return parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")

    @field_validator('overall_sentiment_label', mode='before')
    @classmethod
    def normalize_overall_label(cls, v: Any) -> Optional[str]:
        return TickerSentiment.normalize_and_validate_label(v)

    @field_validator('symbols', mode='before')
    @classmethod
    def clean_and_validate_symbols_list(cls, v: Any) -> List[str]:
        if v is None: return []
        if isinstance(v, str):
            v = [s.strip() for s in v.split(',') if s.strip()]
        if not isinstance(v, list):
            raise ValueError("Symbols must be a list of strings or a comma-separated string.")
        
        validated_symbols = []
        for item in v:
            try:
                validated_symbol = TickerSentiment.validate_and_normalize_ticker(item)
                validated_symbols.append(validated_symbol)
            except ValueError:
                 logger.warning(f"Invalid symbol format '{item}' in {cls.__name__}.symbols, skipping.")
        return list(set(validated_symbols))
        
    @field_serializer('link', 'image_url', when_used='json')
    def serialize_url_to_string(self, url: Optional[HttpUrl]) -> Optional[str]:
        return str(url) if url is not None else None

    @field_serializer('published_at', when_used='json')
    def serialize_published_at_to_iso(self, dt: Optional[AwareDatetime]) -> Optional[str]:
        if dt is None: return None
        return dt.isoformat().replace('+00:00', 'Z')


class CompanyOverview(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra='ignore', validate_assignment=True)

    symbol: StrictStr = Field(...)
    name: Optional[StrictStr] = Field(None, alias='longName')
    asset_type: Optional[StrictStr] = Field(None, alias='quoteType')
    exchange: Optional[StrictStr] = Field(None)
    currency: Optional[StrictStr] = Field(None)
    financial_currency: Optional[StrictStr] = Field(None)
    country: Optional[StrictStr] = Field(None)
    sector: Optional[StrictStr] = Field(None)
    industry: Optional[StrictStr] = Field(None)
    website: Optional[HttpUrl] = Field(None, alias="website_url")
    address: Optional[StrictStr] = Field(None)
    long_business_summary: Optional[StrictStr] = Field(None, alias='description')
    fiscal_year_end: Optional[StrictStr] = Field(None)
    latest_quarter: Optional[Date] = Field(default=None) # Opcionális

    market_cap: Optional[StrictInt] = Field(None, ge=0)
    enterprise_value: Optional[StrictInt] = Field(None)
    trailing_pe: Optional[StrictFloat] = Field(None, alias="pe_ratio")
    forward_pe: Optional[StrictFloat] = Field(None)
    peg_ratio: Optional[StrictFloat] = Field(None, alias='pegRatio')
    price_to_book_ratio: Optional[StrictFloat] = Field(None, alias='priceToBook', ge=0)
    price_to_sales_ratio_ttm: Optional[StrictFloat] = Field(None, alias='priceToSalesTrailing12Months', ge=0)
    ev_to_revenue: Optional[StrictFloat] = Field(None, alias='enterpriseToRevenue')
    ev_to_ebitda: Optional[StrictFloat] = Field(None, alias='enterpriseToEbitda')

    ebitda: Optional[StrictInt] = Field(None)
    profit_margin: Optional[StrictFloat] = Field(None, alias='profitMargins')
    operating_margin_ttm: Optional[StrictFloat] = Field(None, alias='operatingMargins')
    return_on_assets_ttm: Optional[StrictFloat] = Field(None, alias='returnOnAssets')
    return_on_equity_ttm: Optional[StrictFloat] = Field(None, alias='returnOnEquity')
    revenue_ttm: Optional[StrictInt] = Field(None, alias='totalRevenue', ge=0)
    gross_profit_ttm: Optional[StrictInt] = Field(None, alias='grossProfits')
    revenue_per_share_ttm: Optional[StrictFloat] = Field(None, alias='revenuePerShare', ge=0)
    trailing_eps: Optional[StrictFloat] = Field(None, alias='eps')
    forward_eps: Optional[StrictFloat] = Field(None)
    diluted_eps_ttm: Optional[StrictFloat] = Field(None, alias='dilutedEpsTTM')

    quarterly_earnings_growth_yoy: Optional[StrictFloat] = Field(None, alias='earningsQuarterlyGrowth')
    quarterly_revenue_growth_yoy: Optional[StrictFloat] = Field(None, alias='revenueQuarterlyGrowth')

    dividend_per_share: Optional[StrictFloat] = Field(None, alias='dividendRate', ge=0)
    dividend_yield: Optional[StrictFloat] = Field(None, ge=0)
    ex_dividend_date: Optional[Date] = Field(default=None) # Opcionális

    beta: Optional[StrictFloat] = Field(None)
    fifty_two_week_high: Optional[StrictFloat] = Field(None, alias='_52_week_high', ge=0)
    fifty_two_week_low: Optional[StrictFloat] = Field(None, alias='_52_week_low', ge=0)
    fifty_day_average: Optional[StrictFloat] = Field(None, alias='fiftyDayAverage', ge=0)
    two_hundred_day_average: Optional[StrictFloat] = Field(None, alias='twoHundredDayAverage', ge=0)
    
    logo_url: Optional[HttpUrl] = Field(default=None)

    shares_outstanding: Optional[StrictInt] = Field(None, ge=0)
    shares_float: Optional[StrictInt] = Field(None, alias='floatShares', ge=0)
    shares_short: Optional[StrictInt] = Field(None, ge=0)
    shares_short_prior_month: Optional[StrictInt] = Field(None, ge=0)
    short_ratio: Optional[StrictFloat] = Field(None, ge=0)
    short_percent_outstanding: Optional[StrictFloat] = Field(None, alias='sharesPercentSharesOut', ge=0, le=1.0)
    short_percent_float: Optional[StrictFloat] = Field(None, alias='shortPercentOfFloat', ge=0)
    book_value: Optional[StrictFloat] = Field(None)

    last_split_factor: Optional[StrictStr] = Field(None)
    last_split_date: Optional[Date] = Field(default=None) # Opcionális

    analyst_target_price: Optional[StrictFloat] = Field(None, alias='targetMeanPrice', ge=0)
    
    dividends: List[DividendData] = Field(default_factory=list)
    splits: List[StockSplitData] = Field(default_factory=list)
    
    raw_data_provider: Optional[StrictStr] = Field(default=None)

    @field_validator('symbol', mode='before')
    @classmethod
    def validate_overview_symbol(cls, v: Any) -> str:
        return TickerSentiment.validate_and_normalize_ticker(v)

    @field_validator(
        'name', 'asset_type', 'exchange', 'currency', 'financial_currency',
        'country', 'sector', 'industry', 'address', 'long_business_summary',
        'fiscal_year_end', 'raw_data_provider',
        mode='before')
    @classmethod
    def clean_overview_strings(cls, v: Any, info: ValidationInfo) -> Optional[str]:
        cleaned = _clean_value(v)
        return str(cleaned).strip() if cleaned is not None else None
    
    @field_validator('last_split_factor', mode='before')
    @classmethod
    def validate_split_factor_string_format(cls, v: Any) -> Optional[str]:
         cleaned = _clean_value(v)
         if cleaned is None: return None
         try:
             return StockSplitData.validate_split_ratio_str(cleaned)
         except ValueError:
            logger.warning(f"Invalid format for last_split_factor: '{cleaned}' in {cls.__name__}. Expected 'N:M'. Setting to None.")
            return None

    @field_validator(
        'trailing_pe', 'forward_pe', 'peg_ratio', 'price_to_book_ratio', 'price_to_sales_ratio_ttm',
        'ev_to_revenue', 'ev_to_ebitda', 'profit_margin', 'operating_margin_ttm', 'return_on_assets_ttm',
        'return_on_equity_ttm', 'revenue_per_share_ttm', 'trailing_eps', 'forward_eps', 'diluted_eps_ttm',
        'quarterly_earnings_growth_yoy', 'quarterly_revenue_growth_yoy', 'dividend_per_share', 'dividend_yield',
        'beta', 'fifty_two_week_high', 'fifty_two_week_low', 'fifty_day_average', 'two_hundred_day_average',
        'short_ratio', 'short_percent_outstanding', 'short_percent_float', 'book_value', 'analyst_target_price',
        mode='before'
    )
    @classmethod
    def parse_overview_floats(cls, v: Any, info: ValidationInfo) -> Optional[float]:
        val = parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")
        if info.field_name == 'short_percent_outstanding' and val is not None and not (0.0 <= val <= 1.0):
            logger.warning(f"Value for short_percent_outstanding ({val}) is outside the expected 0-1 range in {cls.__name__}. Using as is.")
        return val

    @field_validator(
        'market_cap', 'enterprise_value', 'ebitda', 'revenue_ttm', 'gross_profit_ttm',
        'shares_outstanding', 'shares_float', 'shares_short', 'shares_short_prior_month',
        mode='before'
    )
    @classmethod
    def parse_overview_ints(cls, v: Any, info: ValidationInfo) -> Optional[int]:
         return parse_optional_int(v, context=f"{cls.__name__}.{info.field_name}")

    @field_validator('website', 'logo_url', mode='before')
    @classmethod
    def clean_http_url(cls, v: Any, info: ValidationInfo) -> Optional[str]:
        cleaned = _clean_value(v)
        if cleaned is None: return None
        url_str = str(cleaned).strip()
        if not url_str: return None
        if not url_str.startswith(('http://', 'https://', '//')) and '.' in url_str:
             url_str = 'https://' + url_str
        return url_str
            
    @field_validator('latest_quarter', 'ex_dividend_date', 'last_split_date', mode='before')
    @classmethod
    def validate_overview_dates(cls, v: Any, info: ValidationInfo) -> Optional[Date]:
        """
        Robosztus dátumvalidátor opcionális Date mezőkhöz.
        Kezeli a Date, Datetime, Unix timestamp, és különböző ISO string formátumokat.
        Sikertelen validáció esetén None-t ad vissza és warningot logol.
        """
        if v is None: return None
        if isinstance(v, Date): return v
        if isinstance(v, Datetime): return v.date()

        field_name = info.field_name
        class_name = cls.__name__

        if isinstance(v, (int, float)):
            if not math.isfinite(v):
                logger.warning(f"Non-finite (NaN/Inf) timestamp '{v}' for optional field {field_name} in {class_name}. Setting to None.")
                return None
            try:
                dt_obj = Datetime.fromtimestamp(v, tz=timezone.utc)
                return dt_obj.date()
            except (OSError, ValueError, TypeError) as e:
                logger.warning(f"Could not parse timestamp '{v}' to date for optional field {field_name} in {class_name}: {e}. Setting to None.")
                return None

        if isinstance(v, str):
            cleaned_str = _clean_value(v)
            if not cleaned_str: return None
            try:
                iso_str_for_dt = cleaned_str.replace('Z', '+00:00') if 'T' in cleaned_str and 'Z' in cleaned_str.upper() else cleaned_str
                dt_obj = Datetime.fromisoformat(iso_str_for_dt)
                return dt_obj.date()
            except ValueError:
                try:
                    return Date.fromisoformat(cleaned_str)
                except ValueError:
                    logger.warning(f"Invalid date string format for optional field {field_name}: '{cleaned_str}' in {class_name}. Setting to None.")
                    return None
        
        logger.warning(f"Unhandled date type for optional field {field_name}: {type(v)} ('{v}') in {class_name}. Setting to None.")
        return None

class FinancialsData(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True)

    # Ezeket a YFinance mapper adja:
    latest_annual_revenue: Optional[StrictInt] = Field(None, ge=0)
    latest_annual_net_income: Optional[StrictInt] = Field(None)
    latest_quarterly_revenue: Optional[StrictInt] = Field(None, ge=0)
    latest_quarterly_net_income: Optional[StrictInt] = Field(None)
    total_assets: Optional[StrictInt] = Field(None, ge=0)
    total_liabilities: Optional[StrictInt] = Field(None, ge=0)
    report_date: Optional[StrictStr] = Field(None) # YYYY-MM-DD <-- Erre van validátorunk
    currency: Optional[StrictStr] = Field(None)
    raw_data_provider: Optional[StrictStr] = Field(default=None)
    symbol: Optional[StrictStr] = Field(None)

    @field_validator('symbol', mode='before')
    @classmethod
    def validate_financials_symbol(cls, v: Any) -> Optional[str]:
        if v is None: return None
        return TickerSentiment.validate_and_normalize_ticker(v)

    # EZ A VALIDÁTOR HELYES ÉS ELÉG A report_date / reported_date_iso kezelésére
    @field_validator('report_date', mode='before')
    @classmethod
    def validate_financials_report_date_str(cls, v: Any, info: ValidationInfo) -> Optional[str]: # info hozzáadva
        if v is None: return None
        # A _validate_date_string-nek YYYY-MM-DD stringet kell visszaadnia, ha sikeres
        return _validate_date_string(str(v), context=f"{cls.__name__}.{info.field_name}")

    # A period_year és period_type validátorok itt maradnak, bár a mezők ki vannak kommentelve
    # Ha a mezőket visszateszed, ezek a validátorok kellenek.
    # @field_validator('period_year', mode='before')
    # @classmethod
    # def validate_financials_year(cls, v: Any) -> Optional[int]:
    #     return parse_optional_int(v, context=f"{cls.__name__}.period_year", min_val=1900, max_val=Datetime.now().year + 5)

    # @field_validator('period_type', mode='before')
    # @classmethod
    # def validate_period_type(cls, v: Any) -> str:
    #     cleaned = _clean_value(v)
    #     if not cleaned or not isinstance(cleaned, str):
    #         raise ValueError(f"period_type must be a non-empty string in {cls.__name__}")
    #     val_lower = cleaned.lower()
    #     if val_lower not in ['annual', 'quarterly']:
    #         raise ValueError(f"Invalid period_type '{cleaned}' in {cls.__name__}. Must be 'annual' or 'quarterly'.")
    #     return val_lower
        
    # <<< EZT A RÉSZT TELJESEN TÖRÖLD KI, MERT Felesleges és hibát okoz >>>
    # @field_validator('reported_date_iso', mode='before')
    # @classmethod
    # def validate_financials_report_date_str(cls, v: Any) -> Optional[str]:
    #     if v is None: return None
    #     return _validate_date_string(str(v), context=f"{cls.__name__}.reported_date_iso")
    # <<< EDDIG TÖRÖLD >>>

    # A többi validátor (parse_financial_ints, clean_financials_provider) marad, azok más mezőkre vonatkoznak.
    @field_validator(
        # ... (mezőnevek)
        # Figyelj, hogy a 'total_revenue', 'cost_of_revenue' stb. mezők valójában nincsenek definiálva
        # a FinancialsData modelledben fentebb! Csak latest_annual_revenue stb. vannak.
        # Erre a validátorra csak akkor van szükség, ha ezek a mezők léteznek.
        # Jelenleg ezek a mezők nincsenek a modelledben:
        # 'total_revenue', 'cost_of_revenue', 'gross_profit', 'operating_income', 'net_income',
        # 'ebit', 'ebitda', 'total_equity', 'cash_and_equivalents', 'cash_flow_operating',
        # 'cash_flow_investing', 'cash_flow_financing', 'capital_expenditures', 'free_cash_flow',
        # Viszont a latest_annual_revenue, total_assets stb. mezőkre lehet, hogy kellene validátor,
        # bár ha a parse_optional_int/float már a YFinance mapperekben megtörténik, itt nem feltétlenül.
        # Döntsd el, hogy a parse_financial_ints validátor mely mezőkre kell.
        # Ha a YFinance mapper már a helyes típust adja, akkor itt nem kell külön parse-olni.
        # Ha mégis kell, akkor a helyes mezőneveket add meg a listában.
        'latest_annual_revenue', 'latest_annual_net_income', # ... és a többi létező mező
        mode='before'
    )
    @classmethod
    def parse_financial_ints_and_floats(cls, v: Any, info: ValidationInfo) -> Optional[Union[int, float]]: # Lehet float is
        # A parse_optional_int / parse_optional_float használata itt attól függ,
        # hogy a YFinance mapper milyen típust ad a payloadban.
        # Ideális esetben a mapper már a helyes típust (int/float) adja.
        if isinstance(v, (int, float)): return v
        if isinstance(v, str):
            parsed = parse_optional_int(v, context=f"{cls.__name__}.{info.field_name}")
            if parsed is not None: return parsed
            return parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}") # Próbáljuk float-ként is
        return None


    @field_validator('raw_data_provider', mode='before')
    @classmethod
    def clean_financials_provider(cls, v: Any) -> Optional[str]:
        cleaned = _clean_value(v)
        return str(cleaned).strip() if cleaned is not None else None

class EarningsPeriodData(BaseModel):
    """
    Represents the data for a single earnings period (annual or quarterly).
    Designed to hold data typically available from sources like AlphaVantage or YFinance.
    """
    model_config = ConfigDict(
        extra='ignore',         # Ignore extra fields from the source
        validate_assignment=True, # Validate field assignments after initialization
        populate_by_name=True,  # Allow using aliases during initialization
    )

    # --- Core Period Information ---
    # Using 'date' (Date object) instead of 'reported_date_iso' (string) for better type safety
    # Alias 'fiscalDateEnding' for AlphaVantage compatibility
    date: Date = Field(..., description="A pénzügyi periódus záró dátuma (YYYY-MM-DD).", alias="fiscalDateEnding")
    # period_type ('annual'/'quarterly') is implicitly defined by the list it resides in (see EarningsData)

    # --- Reported vs Estimated ---
    # Aliases for AlphaVantage compatibility
    reported_eps: Optional[StrictFloat] = Field(None, description="Jelentett egy részvényre jutó eredmény (EPS).", alias="reportedEPS")
    estimated_eps: Optional[StrictFloat] = Field(None, description="Becsült egy részvényre jutó eredmény (EPS).", alias="estimatedEPS")
    surprise: Optional[StrictFloat] = Field(None, description="Az EPS meglepetés abszolút értéke.")
    surprise_percentage: Optional[StrictFloat] = Field(None, description="Az EPS meglepetés százalékos értéke.", alias="surprisePercentage")

    # --- Revenue (Optional, as sometimes only EPS is available) ---
    # Note: YFinance income statement might provide more detailed revenue breakdown,
    # which could be added here or kept in the separate FinancialsData model.
    reported_revenue: Optional[StrictInt] = Field(None, description="Jelentett árbevétel.", ge=0) # Keep revenue optional and integer
    estimated_revenue: Optional[StrictInt] = Field(None, description="Becsült árbevétel.", ge=0)
    revenue_surprise: Optional[StrictInt] = Field(None, description="Árbevétel meglepetés (abszolút).")
    revenue_surprise_percentage: Optional[StrictFloat] = Field(None, description="Árbevétel meglepetés (százalékos).")

    # --- Net Income (Optional, may overlap with FinancialsData) ---
    net_income: Optional[StrictInt] = Field(None, description="Nettó jövedelem erre a periódusra.")

    # --- Common Validator for Dates ---
    @field_validator('date', mode='before')
    @classmethod
    def validate_period_date(cls, v: Any, info: ValidationInfo) -> Date:
        # Use the robust generic date validator defined earlier (e.g., in RatingPoint)
        # It handles str, int, float, datetime -> Date conversion and validation
        try:
            # Assuming RatingPoint.validate_generic_date exists and is suitable
            return RatingPoint.validate_generic_date(v, info)
        except ValueError as e:
            # Re-raise with specific context if needed, or let the original error propagate
            raise ValueError(f"Invalid date format for {cls.__name__}.{info.field_name}: {v}. Error: {e}") from e

    # --- Common Validator for Optional Floats (EPS, Surprise %) ---
    @field_validator('reported_eps', 'estimated_eps', 'surprise', 'surprise_percentage', 'revenue_surprise_percentage', mode='before')
    @classmethod
    def parse_optional_float_values(cls, v: Any, info: ValidationInfo) -> Optional[float]:
        # Use the helper function, allowing None
        return parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")

    # --- Common Validator for Optional Integers (Revenue, Net Income) ---
    @field_validator('reported_revenue', 'estimated_revenue', 'revenue_surprise', 'net_income', mode='before')
    @classmethod
    def parse_optional_int_values(cls, v: Any, info: ValidationInfo) -> Optional[int]:
        # Use the helper function, allowing None
        # Add ge=0 check specifically for revenue if needed here or rely on Field(ge=0)
        val = parse_optional_int(v, context=f"{cls.__name__}.{info.field_name}")
        if val is not None and 'revenue' in info.field_name and val < 0:
             logger.warning(f"Revenue field '{info.field_name}' in {cls.__name__} is negative ({val}). Check data source.")
             # Decide whether to return None or keep the negative value based on requirements
             # return None
        return val

    # --- Model Validator (Optional): Calculate Surprise if missing ---
    @model_validator(mode='after')
    def calculate_surprises(self) -> 'EarningsPeriodData':
        # Calculate EPS surprise if possible and not provided
        if self.surprise is None and self.reported_eps is not None and self.estimated_eps is not None:
            self.surprise = round(self.reported_eps - self.estimated_eps, 4) # Use appropriate precision

        # Calculate EPS surprise percentage if possible and not provided
        if self.surprise_percentage is None and self.surprise is not None and self.estimated_eps is not None and not math.isclose(self.estimated_eps, 0):
            try:
                self.surprise_percentage = round((self.surprise / abs(self.estimated_eps)) * 100, 2)
            except ZeroDivisionError:
                pass # Should be caught by isclose check, but safety first

        # Calculate Revenue surprise (similar logic)
        if self.revenue_surprise is None and self.reported_revenue is not None and self.estimated_revenue is not None:
             self.revenue_surprise = self.reported_revenue - self.estimated_revenue

        if self.revenue_surprise_percentage is None and self.revenue_surprise is not None and self.estimated_revenue is not None and self.estimated_revenue != 0:
            try:
                self.revenue_surprise_percentage = round((self.revenue_surprise / abs(self.estimated_revenue)) * 100, 2)
            except ZeroDivisionError:
                 pass
        return self


class EarningsData(BaseModel):
    """
    Container model holding the complete earnings history (annual and quarterly) for a stock.
    This replaces the old simple EarningsData and the EarningsReport model for use
    within FinBotStockResponse.
    """
    model_config = ConfigDict(
        extra='ignore',
        validate_assignment=True,
    )

    symbol: Optional[StrictStr] = Field(None, description="Tőzsdei szimbólum.") # Optional if already present in parent
    annual_reports: List[EarningsPeriodData] = Field(default_factory=list, description="Éves earnings riportok listája.")
    quarterly_reports: List[EarningsPeriodData] = Field(default_factory=list, description="Negyedéves earnings riportok listája.")
    raw_data_provider: Optional[StrictStr] = Field(default=None, description="Az adatokat szolgáltató API neve (pl. 'yfinance', 'alphavantage').")
    currency: Optional[StrictStr] = Field(None, description="A pénzügyi adatok pénzneme.")
    # --- Validators ---
    @field_validator('symbol', mode='before')
    @classmethod
    def validate_earnings_symbol(cls, v: Any) -> Optional[str]:
        if v is None: return None
        # Reuse validator from TickerSentiment
        try:
            return TickerSentiment.validate_and_normalize_ticker(v)
        except ValueError:
            logger.warning(f"Invalid symbol '{v}' provided to {cls.__name__}, setting to None.")
            return None

    @field_validator('raw_data_provider', mode='before')
    @classmethod
    def clean_provider_str(cls, v: Any) -> Optional[str]:
        # Reuse validator from FinancialsData
        return FinancialsData.clean_financials_provider(v)

    # --- Model Validator (Optional): Ensure lists are sorted by date ---
    @model_validator(mode='after')
    def sort_reports_by_date(self) -> 'EarningsData':
        try:
            if self.annual_reports:
                self.annual_reports.sort(key=lambda x: x.date, reverse=True)
            if self.quarterly_reports:
                self.quarterly_reports.sort(key=lambda x: x.date, reverse=True)
        except Exception as e:
            logger.warning(f"Could not sort earnings reports for symbol '{self.symbol}': {e}", exc_info=False)
        return self
# ==========================================================
# === 3. OHLCV és Indikátor Modellek ===
# ==========================================================

class ChartDataPoint(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True)

    t: StrictInt = Field(..., description="Unix timestamp in milliseconds (UTC).")
    o: StrictFloat = Field(..., description="Open price.", ge=0)
    h: StrictFloat = Field(..., description="High price.", ge=0)
    l: StrictFloat = Field(..., description="Low price.", ge=0)
    c: StrictFloat = Field(..., description="Close price.", ge=0)
    v: Optional[StrictInt] = Field(default=None, description="Volume.", ge=0)

    @field_validator('t', mode='before')
    @classmethod
    def parse_chart_time_to_int(cls, v: Any, info: ValidationInfo) -> int:
        parsed_t = None
        if isinstance(v, (int, float)):
            parsed_t = int(v)
        else:
            parsed_t = parse_optional_int(v, context=f"{cls.__name__}.{info.field_name}")

        if parsed_t is None:
            raise ValueError(f"Invalid or missing value for {cls.__name__}.{info.field_name}: '{v}'")
        return parsed_t

    @field_validator('o', 'h', 'l', 'c', mode='before')
    @classmethod
    def parse_chart_price(cls, v: Any, info: ValidationInfo) -> float:
        parsed = parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")
        if parsed is None:
            raise ValueError(f"Required price field '{info.field_name}' cannot be None or invalid for {cls.__name__}.")
        if parsed < 0:
            logger.debug(f"Price field '{info.field_name}' is negative ({parsed}) for {cls.__name__}.")
        return parsed

    @field_validator('v', mode='before')
    @classmethod
    def parse_chart_volume(cls, v: Any, info: ValidationInfo) -> Optional[int]:
        parsed = parse_optional_int(v, context=f"{cls.__name__}.{info.field_name}")
        if parsed is not None and parsed < 0:
             logger.warning(f"Volume field '{info.field_name}' is negative ({parsed}) for {cls.__name__}. Setting to None.")
             return None
        return parsed


class CompanyPriceHistoryEntry(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True)

    time: StrictInt = Field(..., description="Unix timestamp másodpercben (UTC).")
    open: StrictFloat = Field(..., ge=0)
    high: StrictFloat = Field(..., ge=0)
    low: StrictFloat = Field(..., ge=0)
    close: StrictFloat = Field(..., ge=0)
    adj_close: Optional[StrictFloat] = Field(default=None, ge=0)
    volume: Optional[StrictInt] = Field(default=None, ge=0)

    @field_validator('time', mode='before')
    @classmethod
    def parse_time_to_int(cls, v: Any, info: ValidationInfo) -> int:
        return ChartDataPoint.parse_chart_time_to_int(v, info)

    @field_validator('open', 'high', 'low', 'close', 'adj_close', mode='before')
    @classmethod
    def parse_price_history_price(cls, v: Any, info: ValidationInfo) -> Optional[float]:
        is_required = info.field_name != 'adj_close'
        parsed = parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")
        if is_required and parsed is None:
            raise ValueError(f"Required price field '{info.field_name}' cannot be None or invalid for {cls.__name__}.")
        if parsed is not None and parsed < 0:
             logger.debug(f"Price field '{info.field_name}' is negative ({parsed}) for {cls.__name__}.")
        return parsed

    @field_validator('volume', mode='before')
    @classmethod
    def parse_price_history_volume(cls, v: Any, info: ValidationInfo) -> Optional[int]:
        return ChartDataPoint.parse_chart_volume(v, info)


class LatestOHLCV(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True)

    t: Optional[StrictInt] = Field(default=None, description="Unix timestamp másodpercben (UTC).")
    o: Optional[StrictFloat] = Field(default=None, ge=0)
    h: Optional[StrictFloat] = Field(default=None, ge=0)
    l: Optional[StrictFloat] = Field(default=None, ge=0)
    c: Optional[StrictFloat] = Field(default=None, ge=0)
    v: Optional[StrictInt] = Field(default=None, ge=0)
    time_iso: Optional[StrictStr] = Field(default=None, description="Original timestamp as ISO 8601 string (UTC).")

    @field_validator('t', mode='before')
    @classmethod
    def parse_latest_ohlcv_time_to_int(cls, v: Any, info: ValidationInfo) -> Optional[int]:
        if v is None: return None
        return ChartDataPoint.parse_chart_time_to_int(v, info)

    @field_validator('o', 'h', 'l', 'c', mode='before')
    @classmethod
    def parse_latest_float(cls, v: Any, info: ValidationInfo) -> Optional[float]:
        parsed = parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")
        if parsed is not None and parsed < 0:
             logger.debug(f"Price field '{info.field_name}' is negative ({parsed}) for {cls.__name__}.")
        return parsed

    @field_validator('v', mode='before')
    @classmethod
    def parse_latest_volume(cls, v: Any, info: ValidationInfo) -> Optional[int]:
        return ChartDataPoint.parse_chart_volume(v, info)

    @field_validator('time_iso', mode='before')
    @classmethod
    def validate_latest_time_iso_string(cls, v: Any) -> Optional[str]:
        if v is None: return None
        cleaned = _clean_value(v)
        if cleaned is None: return None
        try:
            return parse_timestamp_to_iso_utc(cleaned, context=f"{cls.__name__}.time_iso")
        except ValueError:
             logger.warning(f"Invalid ISO string format for {cls.__name__}.time_iso: {cleaned}. Setting to None.")
             return None


class IndicatorPoint(BaseModel):
    model_config = ConfigDict(extra='ignore')
    t: StrictInt = Field(...)
    value: Optional[StrictFloat] = Field(default=None)

    @field_validator('t', mode='before')
    @classmethod
    def parse_indicator_time_to_int(cls, v: Any, info: ValidationInfo) -> int:
        return ChartDataPoint.parse_chart_time_to_int(v, info)
        
    @field_validator('value', mode='before')
    @classmethod
    def parse_indicator_value(cls, v: Any, info: ValidationInfo) -> Optional[float]:
         return parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")


class VolumePoint(BaseModel):
    model_config = ConfigDict(extra='ignore')
    t: StrictInt = Field(...)
    value: Optional[StrictInt] = Field(default=None, ge=0)
    color: Optional[StrictStr] = Field(default=None)

    @field_validator('t', mode='before')
    @classmethod
    def parse_vol_time_to_int(cls, v: Any, info: ValidationInfo) -> int:
        return ChartDataPoint.parse_chart_time_to_int(v, info)

    @field_validator('value', mode='before')
    @classmethod
    def parse_vol_value(cls, v: Any, info: ValidationInfo) -> Optional[int]:
        return ChartDataPoint.parse_chart_volume(v, info)

    @field_validator('color', mode='before')
    @classmethod
    def validate_vol_color(cls, v: Any) -> Optional[str]:
         cleaned = _clean_value(v)
         if cleaned is None: return None
         color_str = str(cleaned).strip()
         if not color_str: return None
         if not re.fullmatch(r"#[0-9a-fA-F]{6}", color_str):
             logger.warning(f"Invalid color format for {cls.__name__}: '{color_str}'. Expected #RRGGBB. Setting to None.")
             return None
         return color_str


class MACDHistPoint(BaseModel):
    model_config = ConfigDict(extra='ignore')
    t: StrictInt = Field(...)
    value: Optional[StrictFloat] = Field(default=None)
    color: Optional[StrictStr] = Field(default=None)

    @field_validator('t', mode='before')
    @classmethod
    def parse_macd_time_to_int(cls, v: Any, info: ValidationInfo) -> int:
        return ChartDataPoint.parse_chart_time_to_int(v, info)

    @field_validator('value', mode='before')
    @classmethod
    def parse_macdhist_value(cls, v: Any, info: ValidationInfo) -> Optional[float]:
         return parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")

    @field_validator('color', mode='before')
    @classmethod
    def validate_macdhist_color(cls, v: Any) -> Optional[str]:
        return VolumePoint.validate_vol_color(v)


class STOCHPoint(BaseModel):
    model_config = ConfigDict(extra='ignore')
    t: StrictInt = Field(...)
    k: Optional[StrictFloat] = Field(default=None, ge=0, le=100)
    d: Optional[StrictFloat] = Field(default=None, ge=0, le=100)

    @field_validator('t', mode='before')
    @classmethod
    def parse_stoch_time_to_int(cls, v: Any, info: ValidationInfo) -> int:
        return ChartDataPoint.parse_chart_time_to_int(v, info)

    @field_validator('k', 'd', mode='before')
    @classmethod
    def parse_stoch_values(cls, v: Any, info: ValidationInfo) -> Optional[float]:
        val = parse_optional_float(v, context=f"{cls.__name__}.{info.field_name}")
        return val


class SMASet(BaseModel):
    model_config = ConfigDict(extra='ignore')
    SMA_SHORT: Optional[List[IndicatorPoint]] = Field(default=None)
    SMA_LONG: Optional[List[IndicatorPoint]] = Field(default=None)

class EMASet(BaseModel):
    model_config = ConfigDict(extra='ignore')
    EMA_SHORT: Optional[List[IndicatorPoint]] = Field(default=None)
    EMA_LONG: Optional[List[IndicatorPoint]] = Field(default=None)

class BBandsSet(BaseModel):
    model_config = ConfigDict(extra='ignore')
    BBANDS_LOWER: Optional[List[IndicatorPoint]] = Field(default=None)
    BBANDS_MIDDLE: Optional[List[IndicatorPoint]] = Field(default=None)
    BBANDS_UPPER: Optional[List[IndicatorPoint]] = Field(default=None)

class RSISeries(BaseModel):
    model_config = ConfigDict(extra='ignore')
    RSI: Optional[List[IndicatorPoint]] = Field(default=None)

class VolumeSeries(BaseModel):
    model_config = ConfigDict(extra='ignore')
    VOLUME: Optional[List[VolumePoint]] = Field(default=None)

class VolumeSMASeries(BaseModel):
    model_config = ConfigDict(extra='ignore')
    VOLUME_SMA: Optional[List[IndicatorPoint]] = Field(default=None)

class MACDSeries(BaseModel):
    model_config = ConfigDict(extra='ignore')
    MACD_LINE: Optional[List[IndicatorPoint]] = Field(default=None)
    MACD_SIGNAL: Optional[List[IndicatorPoint]] = Field(default=None)
    MACD_HIST: Optional[List[MACDHistPoint]] = Field(default=None)

class STOCHSeries(BaseModel):
    model_config = ConfigDict(extra='ignore')
    STOCH: Optional[List[STOCHPoint]] = Field(default=None)


class IndicatorHistory(BaseModel):
    model_config = ConfigDict(extra='ignore')
    sma: Optional[SMASet] = Field(default=None)
    ema: Optional[EMASet] = Field(default=None)
    bbands: Optional[BBandsSet] = Field(default=None)
    rsi: Optional[RSISeries] = Field(default=None)
    volume: Optional[VolumeSeries] = Field(default=None)
    volume_sma: Optional[VolumeSMASeries] = Field(default=None)
    macd: Optional[MACDSeries] = Field(default=None)
    stoch: Optional[STOCHSeries] = Field(default=None)


class TechnicalAnalysis(BaseModel):
    """
    Holds the overall technical analysis summary and key indicator states.
    This provides a high-level overview based on raw indicator data.
    """
    model_config = ConfigDict(extra='ignore', validate_assignment=True)

    summary: Optional[StrictStr] = Field(default=None, description="A text summary of the current technical outlook.")
    recommendation: Optional[StrictStr] = Field(default=None, description="Overall recommendation (e.g., Bullish, Bearish, Neutral).")

    @field_validator('summary', 'recommendation', mode='before')
    @classmethod
    def clean_strings(cls, v: Any) -> Optional[str]:
        return _clean_value(v) if v is not None else None


# ==========================================================
# === 4. FŐ API VÁLASZ MODELL (FinBotStockResponse) ===
# ==========================================================

class OldFinancialsData(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True)
    latest_annual_revenue: Optional[StrictInt] = Field(None, ge=0)
    latest_annual_net_income: Optional[StrictInt] = Field(None)
    latest_quarterly_revenue: Optional[StrictInt] = Field(None, ge=0)
    latest_quarterly_net_income: Optional[StrictInt] = Field(None)
    total_assets: Optional[StrictInt] = Field(None, ge=0)
    total_liabilities: Optional[StrictInt] = Field(None, ge=0)
    report_date: Optional[Date] = Field(None) # Opcionális
    currency_symbol: Optional[StrictStr] = Field(None)

    @field_validator(
        'latest_annual_revenue', 'latest_annual_net_income', 'latest_quarterly_revenue',
        'latest_quarterly_net_income', 'total_assets', 'total_liabilities',
        mode='before'
    )
    @classmethod
    def parse_old_financial_ints(cls, v: Any, info: ValidationInfo) -> Optional[int]:
        return parse_optional_int(v, context=f"{cls.__name__}.{info.field_name}")

    @field_validator('report_date', mode='before')
    @classmethod
    def validate_old_financials_report_date(cls, v: Any, info: ValidationInfo) -> Optional[Date]:
        # A 'report_date' opcionális, így a RatingPoint.validate_generic_date hibája esetén
        # None-t kell visszaadni.
        if v is None: return None
        try:
            # RatingPoint.validate_generic_date hibát dob, ha nem tud parse-olni.
            return RatingPoint.validate_generic_date(v, info)
        except ValueError as e:
            logger.warning(f"Invalid date format for optional field {info.field_name}: '{v}' in {cls.__name__}. Setting to None. Error: {e}")
            return None

    @field_validator('currency_symbol', mode='before')
    @classmethod
    def clean_old_financials_currency(cls, v: Any) -> Optional[str]:
        return DividendData.clean_and_validate_currency(v)

    @field_serializer('report_date', when_used='json')
    def serialize_old_report_date_to_iso(self, d: Optional[Date]) -> Optional[str]:
        return d.isoformat() if d is not None else None


class OldEarningsReport(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True)
    year: Optional[StrictInt] = Field(None)
    revenue: Optional[Union[StrictInt, StrictFloat]] = Field(None)
    earnings: Optional[Union[StrictInt, StrictFloat]] = Field(None)
    eps: Optional[StrictFloat] = Field(None)

    @field_validator('year', mode='before')
    @classmethod
    def validate_old_year(cls, v: Any) -> Optional[int]:
        return parse_optional_int(v, context=f"{cls.__name__}.year", min_val=1900, max_val=Datetime.now().year + 5)

    @field_validator('revenue', 'earnings', 'eps', mode='before')
    @classmethod
    def parse_old_financial_values(cls, v: Any, info: ValidationInfo) -> Optional[Union[int, float]]:
        cleaned = _clean_value(v)
        if cleaned is None: return None
        try:
            parsed_value = float(cleaned)
            if not math.isfinite(parsed_value):
                logger.warning(f"Parsed value is NaN or Infinite for {info.field_name} in {cls.__name__}: {v}")
                return None
            return parsed_value
        except (ValueError, TypeError):
            logger.warning(f"Could not parse value for {info.field_name} in {cls.__name__}: {v}")
            return None


class OldEarningsData(BaseModel):
    model_config = ConfigDict(extra='ignore', validate_assignment=True)
    ratings_history: Optional[List[RatingPoint]] = Field(default=None)
    annual_reports: Optional[List[OldEarningsReport]] = Field(default=None)
    quarterly_reports: Optional[List[OldEarningsReport]] = Field(default=None)


class FinBotStockResponse(BaseModel):
    model_config = ConfigDict(validate_assignment=True, extra='ignore')

    symbol: StrictStr = Field(...)
    request_timestamp_utc: AwareDatetime = Field(...)
    data_source_info: StrictStr = Field(..., min_length=1)
    is_data_stale: bool = Field(...)
    last_ohlcv_refreshed_date: Optional[Date] = Field(default=None)

    latest_ohlcv: Optional[LatestOHLCV] = Field(default=None)
    change_percent_day: Optional[StrictFloat] = Field(default=None)
    history_ohlcv: List[CompanyPriceHistoryEntry] = Field(..., description="Historikus OHLCV adatok (másodperc alapú timestamp).")
    indicator_history: Optional[IndicatorHistory] = Field(default=None)
    technical_analysis: Optional[TechnicalAnalysis] = Field(default=None, description="High-level technical analysis summary.")
    latest_indicators: Optional[Dict[str, Optional[float]]] = Field(default=None)

    company_overview: Optional[CompanyOverview] = Field(default=None)

    # === ÚJ/JAVÍTOTT MEZŐK ===
    financials: Optional[FinancialsData] = Field(default=None, description="Részletes pénzügyi adatok.")
    earnings: Optional[EarningsData] = Field(default=None, description="Earnings riport adatok (ratingek nélkül).")
    ratings_history: Optional[List[RatingPoint]] = Field(default=None, description="Függetlenített historikus rating pontok.")
    # =========================

    # === METADATA MEZŐ HOZZÁADÁSA ===
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="További metaadat információk (cache_hit, data_quality, stb.)")
    # ================================

    news: List[NewsItem] = Field(default_factory=list)
    ai_summary_hu: Optional[StrictStr] = Field(default=None)

    # --- Multi-resolution OHLCV ---
    ohlcv_multi: Optional[Dict[str, List[ChartDataPoint]]] = Field(
        default=None,
        description="OHLCV data for multiple resolutions. Keys are intervals (e.g., '1m', '2m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1mo'), values are lists of ChartDataPoint."
    )
    
    @field_validator('symbol', mode='before')
    @classmethod
    def validate_main_symbol(cls, v: Any) -> str:
        return TickerSentiment.validate_and_normalize_ticker(v)

    @field_validator('request_timestamp_utc', mode='before')
    @classmethod
    def validate_request_timestamp(cls, v: Any, info: ValidationInfo) -> AwareDatetime:
        try:
            dt = parse_string_to_aware_datetime(v, context=f"{cls.__name__}.{info.field_name}")
            if dt is None:
                raise ValueError(f"{info.field_name} cannot be None after parsing.")
            return dt
        except ValueError as e:
             raise ValueError(f"Invalid format for {cls.__name__}.{info.field_name}: {v}. Error: {e}")

    @field_validator('last_ohlcv_refreshed_date', mode='before')
    @classmethod
    def validate_ohlcv_refresh_date(cls, v: Any, info: ValidationInfo) -> Optional[Date]:
        # <<< ITT MÁR TÖRÖLHETED A print() ÉS logger.critical() HÍVÁSOKAT >>>
        # A validátor logikája marad!
        field_name = info.field_name if info.field_name else "last_ohlcv_refreshed_date"
        log_prefix = f"[{cls.__name__}.{field_name}]"
        logger.debug(f"{log_prefix} Validator called. Input Value='{v}', Type: {type(v)}") # DEBUG szint elég

        result_date: Optional[Date] = None
        try:
            if v is None: result_date = None
            elif isinstance(v, Date): result_date = v
            elif isinstance(v, datetime): result_date = v.date()
            elif isinstance(v, str):
                cleaned_v = v.strip()
                if not cleaned_v: result_date = None
                else:
                    try:
                        result_date = Date.fromisoformat(cleaned_v)
                    except ValueError as e_parse:
                        logger.warning(f"{log_prefix} Invalid date string format: '{cleaned_v}'. Error: {e_parse}. Setting to None.")
                        result_date = None
            elif isinstance(v, (int, float)):
                try:
                    if not math.isfinite(v): raise ValueError("Non-finite timestamp")
                    dt_obj = datetime.fromtimestamp(v, tz=timezone.utc)
                    result_date = dt_obj.date()
                except (OSError, ValueError, TypeError, OverflowError) as e_ts:
                    logger.warning(f"{log_prefix} Could not parse timestamp '{v}' to date: {e_ts}. Setting to None.")
                    result_date = None
            else:
                logger.warning(f"{log_prefix} Unhandled input type '{type(v)}' for value '{v}'. Setting to None.")
                result_date = None
        except Exception as e_outer:
            logger.error(f"{log_prefix} UNEXPECTED EXCEPTION during validation! Error: {e_outer}. Returning None.", exc_info=True)
            result_date = None

        logger.debug(f"{log_prefix} Validator returning: Value='{result_date}', Type: {type(result_date)}")
        return result_date

    @field_validator('data_source_info', 'ai_summary_hu', mode='before')
    @classmethod
    def clean_final_strings(cls, v: Any, info: ValidationInfo) -> Optional[str]:
        cleaned = _clean_value(v)
        value_str = str(cleaned).strip() if cleaned is not None else None
        if info.field_name == 'data_source_info' and not value_str:
            raise ValueError(f"{info.field_name} cannot be empty for {cls.__name__}")
        return value_str

    @model_validator(mode='after')
    def check_ohlcv_history_exists_and_not_empty(self) -> 'FinBotStockResponse':
        if self.history_ohlcv is None:
             raise ValueError("'history_ohlcv' is missing from the response data.")
        if not self.history_ohlcv:
            logger.warning(f"{self.__class__.__name__} for symbol '{self.symbol}' has empty 'history_ohlcv'.")
        return self

    @model_validator(mode='after')
    def check_latest_ohlcv_consistency(self) -> 'FinBotStockResponse':
        if self.latest_ohlcv and self.latest_ohlcv.t and self.last_ohlcv_refreshed_date:
             try:
                 latest_dt_utc = Datetime.fromtimestamp(self.latest_ohlcv.t, tz=timezone.utc)
                 if latest_dt_utc.date() != self.last_ohlcv_refreshed_date:
                      logger.warning(
                          f"Potential inconsistency for '{self.symbol}': "
                          f"latest_ohlcv date ({latest_dt_utc.date()}) "
                          f"differs from last_ohlcv_refreshed_date ({self.last_ohlcv_refreshed_date})."
                      )
             except Exception as e:
                  logger.warning(f"Could not perform latest OHLCV consistency check for '{self.symbol}': {e}", exc_info=False)
        elif self.latest_ohlcv and self.latest_ohlcv.t and not self.last_ohlcv_refreshed_date:
             logger.info(f"Latest OHLCV data present for '{self.symbol}', but 'last_ohlcv_refreshed_date' is missing. This might be due to a parsing issue with the date or the date not being provided.")
        return self

    @field_serializer('request_timestamp_utc', when_used='json')
    def serialize_main_request_timestamp_to_iso(self, dt: AwareDatetime) -> str:
        return dt.isoformat().replace('+00:00', 'Z')

    @field_serializer('last_ohlcv_refreshed_date', when_used='json')
    def serialize_main_refreshed_date_to_iso(self, d: Optional[Date]) -> Optional[str]:
        return d.isoformat() if d is not None else None


# ==========================================================
# === 5. Általános Hiba Válasz Modell ===
# ==========================================================

class ErrorResponse(BaseModel):
    model_config = ConfigDict(extra='ignore')
    status: StrictStr = Field(default="error")
    symbol: Optional[StrictStr] = Field(default=None)
    request_id: Optional[StrictStr] = Field(default=None)
    detail: StrictStr = Field(...)
    error_code: Optional[StrictStr] = Field(default=None)

    @field_validator('symbol', mode='before')
    @classmethod
    def validate_error_symbol(cls, v: Any) -> Optional[str]:
         cleaned = _clean_value(v)
         return str(cleaned).upper().strip() if cleaned is not None and str(cleaned).strip() else None
    
    @field_validator('detail', 'status', 'request_id', 'error_code', mode='before')
    @classmethod
    def clean_error_strings(cls, v: Any, info: ValidationInfo) -> Optional[str]:
        cleaned = _clean_value(v)
        val_str = str(cleaned).strip() if cleaned is not None else None
        if info.field_name == 'detail' and not val_str:
            raise ValueError(f"Error detail cannot be empty for {cls.__name__}.")
        if info.field_name == 'status' and not val_str:
            return "error"
        return val_str

# ============================================================================
# Modul Betöltésének Jelzése
# ============================================================================
logger.info(f"--- {__name__} (Pydantic Models v3.8 - Robust Date Validation Unified) loaded successfully. ---")