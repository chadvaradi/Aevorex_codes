# backend/chat/prompt_builder.py

import logging
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Union
from pathlib import Path

# --- Központi Konfiguráció és Modell Importok ---
# Feltételezzük, hogy a központi settings objektum elérhető és konfigurált.
try:
    from ...config import settings # Relatív import, ha a prompt_builder a backend.chat alatt van
except ImportError:
    # Abszolút import fallback, ha a fenti nem működik (pl. teszteléskor)
    try:
        from modules.financehub.backend.config import settings
    except ImportError:
        logging.critical("PROMPT_BUILDER KRITIKUS HIBA: Nem sikerült importálni a 'settings' objektumot. Leállás.", exc_info=True)
        # Helyettesítő settings objektum alapértelmezett értékekkel, hogy a modul betöltődhessen,
        # de ez kritikus hiba, amit javítani kell.
        class FallbackSettings:
            class NEWS:
                MAX_ITEMS_FOR_PROMPT = 3
            class AI:
                CHAT_HISTORY_MAX_MESSAGES_FOR_PROMPT = 5
                TRUNCATE_AI_SUMMARY_CHARS = 750 # Karakterlimit az AI összefoglalóhoz a promptban
        settings = FallbackSettings()
        logging.warning("FallbackSettings használatban a prompt_builder modulban!")


# A ChatMessage és ChatRole modellek importálása
try:
    # Próbáljuk meg a javasolt relatív importot a modellekhez, ha a prompt_builder a chat modul része
    from modules.financehub.backend.models.chat import ChatMessage, ChatRole
except ImportError:
    try:
        # Fallback abszolút importra, ha a backend csomag a PYTHONPATH-on van
        from modules.financehub.backend.models.chat import ChatMessage, ChatRole # VAGY backend.models.chat, a projekt struktúrától függően
    except ImportError:
        logging.critical("PROMPT_BUILDER KRITIKUS HIBA: Nem sikerült importálni a ChatMessage/ChatRole modelleket.", exc_info=True)
        # Definiálás Any-ként fallbackként, a típusellenőrzés korlátozott lesz.
        ChatMessage = Any
        ChatRole = Any # Ez azt jelenti, hogy a ChatRole.USER.value stb. nem fog működni.

from modules.financehub.backend.models.stock import FinBotStockResponse, NewsItem, CompanyOverview, FinancialsData, EarningsData, TechnicalAnalysis, IndicatorHistory, IndicatorPoint, LatestOHLCV

# --- Logger Beállítása ---
logger = logging.getLogger(__name__)
logger.debug("Prompt Builder (v5.0 - Enterprise Robustness) modul inicializálva.")

if ChatMessage is Any or ChatRole is Any:
    logger.warning("ChatMessage vagy ChatRole 'Any'-ként lett feloldva import hibák miatt. A futásidejű ellenőrzések kevésbé lesznek hatékonyak.")
else:
    logger.debug("ChatMessage és ChatRole típusok sikeresen importálva.")

# --- Konstansok és Sablon Elérési Utak ---
BASE_DIR = Path(__file__).resolve().parent # Ez a backend/core/chat
PROMPT_TEMPLATE_DIR = BASE_DIR / "prompt_templates" # ÍGY HELYES: backend/core/chat/prompt_templates/

DEFAULT_CHAT_TEMPLATE_FILE = PROMPT_TEMPLATE_DIR / "default_chat_v1.txt"
# Más template fájlok, ha szükségesek:
# FUNDAMENTAL_QUERY_TEMPLATE_FILE = PROMPT_TEMPLATE_DIR / "fundamental_query_v1.txt"
# NEWS_EVALUATION_TEMPLATE_FILE = PROMPT_TEMPLATE_DIR / "news_evaluation_v1.txt"
# TECHNICAL_ANALYSIS_TEMPLATE_FILE = PROMPT_TEMPLATE_DIR / "technical_analysis_v1.txt"

# Prompt Fejlécek (Magyarul)
STOCK_CONTEXT_HEADER_TPL = "--- {ticker} Részvény Adat Kontextusa ---"
SYS_MSG_HEADER = "--- Rendszer Utasítások ---"
QUESTION_HEADER = "--- Felhasználói Kérdés ---"
HISTORY_HEADER = "--- Beszélgetési Előzmények ---"
RESPONSE_GUIDANCE_HEADER = "--- FinBot Válasza ---" # Vagy "--- Asszisztens Válasza ---"

# Alapértelmezett üzenet, ha a sablonfájl nem tölthető be
FALLBACK_SYSTEM_MESSAGE = """
Ön a FinBot, egy specializált pénzügyi asszisztens.
Célja, hogy informatív és objektív elemzést nyújtson *kizárólag* a rendelkezésre bocsátott részvényadatok alapján.
- Elemezze az adat szekciókat: Áttekintés, Árfolyam, Pénzügyek, Indikátorok, Hírek, AI Összefoglaló.
- Azonosítsa a bullish (pozitív) és bearish (negatív) tényezőket *csak* a megadott adatok alapján.
- Adjon rövid távú (1-4 hét) és hosszabb távú (1-6 hónap) kilátást *csak* a megadott adatok alapján.
- *Ne* találjon ki adatokat vagy használjon külső tudást. Ha az adatok hiányoznak ('N/A', 'Nem elérhető'), ezt explicit módon jelezze.
- Válaszát strukturálja világosan.
- Magyarul válaszoljon.
- Legyen objektív és kerülje a közvetlen befektetési ajánlásokat.
FIGYELEM: A rendszerüzenet sablonfájlja nem volt betölthető, ez egy alapértelmezett üzenet.
"""

# --- Segédfüggvények ---

def _load_prompt_template(file_path: Path, fallback_content: str = "") -> str:
    """Biztonságosan betölt egy szöveges sablonfájlt."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    except FileNotFoundError:
        logger.error(f"Prompt sablonfájl nem található: {file_path}. Fallback tartalom használata.")
        return fallback_content.strip()
    except Exception as e:
        logger.error(f"Hiba a prompt sablonfájl ({file_path}) betöltésekor: {e}", exc_info=True)
        return fallback_content.strip()

def _safe_get_attr_or_key(data_source: Any, key_or_attr: str, default: Any = None) -> Any:
    """
    Biztonságosan lekér egy értéket egy objektum attribútumaként vagy egy dictionary kulcsaként.
    Hasznos, ha a data_source típusa (objektum vs. dict) nem mindig garantált.
    """
    if data_source is None:
        return default
    if isinstance(data_source, dict):
        return data_source.get(key_or_attr, default)
    return getattr(data_source, key_or_attr, default)

def _safe_format_number(value: Any, precision: int = 2, default_str: str = "N/A") -> str:
    """Biztonságosan formáz egy számot, kezelve a None-t és a potenciális hibákat."""
    if value is None:
        return default_str
    try:
        float_val = float(value)
        return f"{float_val:,.{precision}f}"
    except (ValueError, TypeError):
        return str(value) if value else default_str # Ha nem None, de nem szám, stringként

def _safe_format_large_number(value: Any, default_str: str = "N/A") -> str:
    """Nagy számokat (pl. piaci kapitalizáció) olvasható formátumba alakít."""
    if value is None:
        return default_str
    try:
        num = float(value)
        if abs(num) >= 1e12:  # Trillió
            return f"{num / 1e12:.2f}T"
        elif abs(num) >= 1e9:  # Milliárd
            return f"{num / 1e9:.2f}B"
        elif abs(num) >= 1e6:  # Millió
            return f"{num / 1e6:.2f}M"
        else:
            return f"{num:,.0f}" # Kisebb számok, csak vesszővel elválasztva
    except (ValueError, TypeError):
        return str(value) if value else default_str

def _format_timestamp(ts: Any, default_str: str = "N/A") -> str:
    """Unix timestamp-et (másodperc vagy ezredmásodperc) vagy datetime stringet formáz YYYY-MM-DD HH:MM:SS UTC formátumra."""
    if ts is None:
        return default_str
    try:
        if isinstance(ts, (int, float)):
            # Feltételezzük, hogy ha a szám nagyobb, mint egy ésszerű dátum másodpercben (pl. 2000.01.01.),
            # akkor ezredmásodperc lehet. Ez heurisztika.
            if ts > 3_000_000_000: # kb. 2065-ig ms-ben, vagy nagyon nagy s érték
                 ts_seconds = ts / 1000.0
            else:
                 ts_seconds = float(ts)
            dt_obj = datetime.fromtimestamp(ts_seconds, timezone.utc)
            return dt_obj.strftime('%Y-%m-%d %H:%M:%S UTC')
        elif isinstance(ts, str):
            # Próbálkozás ISO formátumú string feldolgozásával
            dt_obj = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            return dt_obj.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
        return str(ts) # Ha nem ismert formátum, adjuk vissza stringként
    except (ValueError, TypeError, OverflowError):
        logger.debug(f"Nem sikerült formázni az időbélyeget: {ts}", exc_info=True)
        return str(ts) if ts else default_str

# === RÉSZVÉNYADAT FORMÁZÓ FÜGGVÉNY (Enterprise Változat) ===
# backend/chat/prompt_builder.py

# ... (az összes import és helper függvény, ahogy a teljes kódodban van) ...

# === RÉSZVÉNYADAT FORMÁZÓ FÜGGVÉNY (Enterprise Változat - JAVÍTOTT) ===
def _format_stock_data_for_prompt(stock_data: Optional[Any]) -> str:
    all_formatted_lines: List[str] = []
    base_indent = "  "
    data_unavailable_msg = f"{base_indent}Nem elérhető"
    any_substantive_data_found_overall = False

    if stock_data is None:
        logger.warning("A stock_data objektum None volt a _format_stock_data_for_prompt függvényben.")
        all_formatted_lines.append(STOCK_CONTEXT_HEADER_TPL.format(ticker="Ismeretlen"))
        all_formatted_lines.append(f"{base_indent}A részvényadat kontextus teljes egészében nem elérhető (az adatobjektum None volt).")
        return "\n".join(all_formatted_lines).strip() + "\n\n"

    ticker = str(_safe_get_attr_or_key(stock_data, 'symbol', _safe_get_attr_or_key(stock_data, 'ticker', "Ismeretlen"))).upper()
    all_formatted_lines.append(STOCK_CONTEXT_HEADER_TPL.format(ticker=ticker))

    # 3.1 Céginformáció és Profil
    overview_lines: List[str] = []
    overview = _safe_get_attr_or_key(stock_data, 'company_overview')
    if overview: # isinstance ellenőrzés itt redundáns lehet, ha a _safe_get_attr_or_key jól működik
        company_name = _safe_get_attr_or_key(overview, 'name', _safe_get_attr_or_key(overview, 'companyName'))
        sector = _safe_get_attr_or_key(overview, 'sector')
        industry = _safe_get_attr_or_key(overview, 'industry')
        description = _safe_get_attr_or_key(overview, 'long_business_summary', _safe_get_attr_or_key(overview, 'description'))
        market_cap = _safe_get_attr_or_key(overview, 'market_cap', _safe_get_attr_or_key(overview, 'marketCap'))
        currency_overview = _safe_get_attr_or_key(overview, 'currency', _safe_get_attr_or_key(stock_data, 'currency'))

        if company_name: overview_lines.append(f"{base_indent}Cég neve: {company_name} ({ticker})")
        if sector: overview_lines.append(f"{base_indent}Szektor: {sector}")
        if industry: overview_lines.append(f"{base_indent}Iparág: {industry}")
        if market_cap is not None:
            mc_formatted = _safe_format_large_number(market_cap)
            curr_prefix = f"{currency_overview} " if currency_overview else ""
            overview_lines.append(f"{base_indent}Piaci kapitalizáció: {curr_prefix}{mc_formatted}")
        if description and isinstance(description, str):
            desc_limit = 500
            truncated_desc = description.strip()[:desc_limit] + ("..." if len(description.strip()) > desc_limit else "")
            overview_lines.append(f"{base_indent}Leírás: {truncated_desc}")

    all_formatted_lines.append("--- Céginformáció és Profil ---")
    if overview_lines:
        all_formatted_lines.extend(overview_lines)
        any_substantive_data_found_overall = True
    else:
        all_formatted_lines.append(data_unavailable_msg)
        logger.debug(f"A '{ticker}' részvényhez a céginformációk (company_overview) hiányoznak vagy üresek.")

    # 3.2 Legutóbbi Árfolyamadatok
    price_lines: List[str] = []
    latest_ohlcv = _safe_get_attr_or_key(stock_data, 'latest_ohlcv')
    change_pct_day = _safe_get_attr_or_key(stock_data, 'change_percent_day', _safe_get_attr_or_key(latest_ohlcv, 'change_percent_day'))

    if latest_ohlcv:
        close_price = _safe_get_attr_or_key(latest_ohlcv, 'close', _safe_get_attr_or_key(latest_ohlcv, 'c'))
        ohlcv_time_raw = _safe_get_attr_or_key(latest_ohlcv, 'time', _safe_get_attr_or_key(latest_ohlcv, 't'))
        volume = _safe_get_attr_or_key(latest_ohlcv, 'volume', _safe_get_attr_or_key(latest_ohlcv, 'v'))
        price_str = _safe_format_number(close_price)
        change_str = f" ({_safe_format_number(change_pct_day)}%)" if change_pct_day is not None else ""
        time_str = _format_timestamp(ohlcv_time_raw)
        price_lines.append(f"{base_indent}Legutóbbi ár ({time_str}): {price_str}{change_str}")
        if volume is not None:
            price_lines.append(f"{base_indent}Forgalom: {_safe_format_number(volume, 0)}")
    elif change_pct_day is not None:
        price_lines.append(f"{base_indent}Legutóbbi napi változás: {_safe_format_number(change_pct_day)}%")

    all_formatted_lines.append("--- Legutóbbi Árfolyamadatok ---")
    if price_lines:
        all_formatted_lines.extend(price_lines)
        any_substantive_data_found_overall = True
    else:
        all_formatted_lines.append(data_unavailable_msg)
        logger.debug(f"A '{ticker}' részvényhez az árfolyamadatok (latest_ohlcv) hiányoznak vagy üresek.")

    # 3.3 Pénzügyi Mutatók és Jelentések
    financials_section_content: List[str] = [] # Külön lista ennek a szekciónak
    financials_data_available_in_section = False # Flag ennek a szekciónak
    
    financials = _safe_get_attr_or_key(stock_data, 'financials')
    earnings = _safe_get_attr_or_key(stock_data, 'earnings')
    currency_financials = _safe_get_attr_or_key(financials, 'currency', _safe_get_attr_or_key(overview, 'currency', '')) # overview-ból is lehet currency
    curr_prefix_fin = f"{currency_financials} " if currency_financials else ""

    if financials:
        latest_revenue_a = _safe_get_attr_or_key(financials, 'latest_annual_revenue')
        latest_income_a = _safe_get_attr_or_key(financials, 'latest_annual_net_income')
        if latest_revenue_a is not None:
            financials_section_content.append(f"{base_indent}Legutóbbi Éves Bevétel: {curr_prefix_fin}{_safe_format_large_number(latest_revenue_a)}")
            financials_data_available_in_section = True
        if latest_income_a is not None:
            financials_section_content.append(f"{base_indent}Legutóbbi Éves Nettó Jövedelem: {curr_prefix_fin}{_safe_format_large_number(latest_income_a)}")
            financials_data_available_in_section = True
        
        latest_revenue_q = _safe_get_attr_or_key(financials, 'latest_quarterly_revenue')
        latest_income_q = _safe_get_attr_or_key(financials, 'latest_quarterly_net_income')
        if latest_revenue_q is not None and latest_revenue_q != latest_revenue_a:
             financials_section_content.append(f"{base_indent}Legutóbbi Negyedéves Bevétel: {curr_prefix_fin}{_safe_format_large_number(latest_revenue_q)}")
             financials_data_available_in_section = True
        if latest_income_q is not None and latest_income_q != latest_income_a:
             financials_section_content.append(f"{base_indent}Legutóbbi Negyedéves Nettó Jövedelem: {curr_prefix_fin}{_safe_format_large_number(latest_income_q)}")
             financials_data_available_in_section = True

        total_assets = _safe_get_attr_or_key(financials, 'total_assets')
        total_liabilities = _safe_get_attr_or_key(financials, 'total_liabilities')
        if total_assets is not None:
            financials_section_content.append(f"{base_indent}Összes Eszköz: {curr_prefix_fin}{_safe_format_large_number(total_assets)}")
            financials_data_available_in_section = True
        if total_liabilities is not None:
            financials_section_content.append(f"{base_indent}Összes Kötelezettség: {curr_prefix_fin}{_safe_format_large_number(total_liabilities)}")
            financials_data_available_in_section = True
        
        report_date = _safe_get_attr_or_key(financials, 'report_date')
        if report_date:
            financials_section_content.append(f"{base_indent}Legutóbbi Jelentés Dátuma: {_format_timestamp(report_date)}")
            financials_data_available_in_section = True

    if earnings:
        annual_reports_list = _safe_get_attr_or_key(earnings, 'annual_reports')
        if isinstance(annual_reports_list, list) and annual_reports_list:
            if len(annual_reports_list) > 0:
                latest_annual_report_data = annual_reports_list[0]
                if latest_annual_report_data:
                    reported_eps = _safe_get_attr_or_key(latest_annual_report_data, 'reported_eps')
                    report_date_eps = _safe_get_attr_or_key(latest_annual_report_data, 'date')
                    if reported_eps is not None:
                        eps_date_str = f" ({_format_timestamp(report_date_eps)})" if report_date_eps else ""
                        financials_section_content.append(f"{base_indent}Legutóbbi Éves Jelentett EPS{eps_date_str}: {curr_prefix_fin}{_safe_format_number(reported_eps)}")
                        financials_data_available_in_section = True
    
    all_formatted_lines.append("--- Pénzügyi Mutatók és Jelentések ---")
    if financials_data_available_in_section and financials_section_content: # Most már a helyes flag-et és listát használjuk
        all_formatted_lines.extend(financials_section_content)
        any_substantive_data_found_overall = True # Itt is jelezzük, ha volt adat
    else:
        all_formatted_lines.append(data_unavailable_msg)
        logger.debug(f"A '{ticker}' részvényhez a pénzügyi adatok (financials/earnings) hiányoznak vagy üresek.")

    # 3.4 Legutóbbi Technikai Indikátorok
    indicators_lines: List[str] = [] # `section_lines` helyett `indicators_lines`
    latest_indicators = _safe_get_attr_or_key(stock_data, 'latest_indicators')
    if isinstance(latest_indicators, dict) and latest_indicators:
        for name in sorted(latest_indicators.keys()):
            value = _safe_get_attr_or_key(latest_indicators, name)
            if value is not None:
                indicators_lines.append(f"{base_indent}{name}: {_safe_format_number(value)}")
    
    all_formatted_lines.append("--- Legutóbbi Technikai Indikátorok ---")
    if indicators_lines:
        all_formatted_lines.extend(indicators_lines)
        any_substantive_data_found_overall = True
    else:
        all_formatted_lines.append(data_unavailable_msg)
        logger.debug(f"A '{ticker}' részvényhez a technikai indikátorok (latest_indicators) hiányoznak vagy üresek.")

    # 3.5 Friss Hírek
    news_lines: List[str] = [] # `section_lines` helyett `news_lines`
    news_list_raw = _safe_get_attr_or_key(stock_data, 'news', [])
    news_limit_prompt: int = getattr(settings.NEWS, 'MAX_ITEMS_FOR_PROMPT', 3) if hasattr(settings, 'NEWS') else 3
    valid_news_items_count = 0
    if isinstance(news_list_raw, list) and news_list_raw:
        for news_item_obj in news_list_raw:
            if valid_news_items_count >= news_limit_prompt: break
            if news_item_obj:
                title = str(_safe_get_attr_or_key(news_item_obj, 'title', '')).strip()
                published_at_raw = _safe_get_attr_or_key(news_item_obj, 'published_at', _safe_get_attr_or_key(news_item_obj, 'publishedDate', _safe_get_attr_or_key(news_item_obj, 'datetime')))
                publisher_name = str(_safe_get_attr_or_key(news_item_obj, 'publisher_name', _safe_get_attr_or_key(news_item_obj, 'publisher', 'Ismeretlen forrás'))).strip()
                published_at_str = _format_timestamp(published_at_raw)
                if title:
                    news_lines.append(f"{base_indent}- {title} (Forrás: {publisher_name}, Dátum: {published_at_str})")
                    valid_news_items_count +=1
    
    all_formatted_lines.append(f"--- Friss Hírek (Max. {news_limit_prompt}) ---")
    if news_lines:
        all_formatted_lines.extend(news_lines)
        any_substantive_data_found_overall = True
    else:
        all_formatted_lines.append(f"{base_indent}Nincsenek releváns hírek.")
        logger.debug(f"A '{ticker}' részvényhez a hírek (news) hiányoznak vagy üresek.")

    # 3.6 AI Által Generált Összefoglaló (Magyar)
    summary_lines_indented: List[str] = [] # `section_lines` helyett `summary_lines_indented`
    ai_summary_hu = _safe_get_attr_or_key(stock_data, 'ai_summary_hu')
    if ai_summary_hu and isinstance(ai_summary_hu, str) and ai_summary_hu.strip():
        max_summary_chars = getattr(settings.AI, 'TRUNCATE_AI_SUMMARY_CHARS', 750) if hasattr(settings, 'AI') else 750
        summary_to_add = ai_summary_hu.strip()
        if len(summary_to_add) > max_summary_chars:
            summary_to_add = summary_to_add[:max_summary_chars] + "..."
            logger.debug(f"Az AI összefoglaló rövidítve lett {max_summary_chars} karakterre a promptban.")
        summary_lines_indented = [f"{base_indent}{line}" for line in summary_to_add.splitlines()]

    # Csak akkor adjuk hozzá a fejlécet és a tartalmat, ha van összefoglaló
    if summary_lines_indented:
        all_formatted_lines.append("--- AI Által Generált Összefoglaló (Magyar) ---")
        all_formatted_lines.extend(summary_lines_indented)
        any_substantive_data_found_overall = True
    # Ha nincs, csendben kihagyjuk (nem írunk "Nem elérhető"-t sem)

    # 4. Végső ellenőrzés és visszatérés
    if not any_substantive_data_found_overall:
        logger.warning(f"Nem sikerült érdemi adatokat kinyerni a '{ticker}' részvényhez. Az LLM általános választ adhat.")
        # Hozzáadhatunk egy sort a végére, hogy jelezzük, ha semmilyen adat nem volt.
        all_formatted_lines.append("\nMegjegyzés: Ehhez a részvényhez jelenleg nem állnak rendelkezésre részletes adatok a rendszerben.")

    return "\n".join(all_formatted_lines).strip() + "\n\n"

# ... (a build_chat_prompt és _format_history_for_prompt függvények, ahogy a teljes kódodban vannak,
# de győződj meg róla, hogy a _format_history_for_prompt-ban a base_indent hiba javítva van,
# pl. a "(Nincs releváns chat előzmény)" sorból törölve, vagy helyben definiálva, ha az a sor kell.)
# A `_format_history_for_prompt`-ban a "(Nincs releváns chat előzmény)" sort érdemes
# az `all_formatted_lines.append(f"{base_indent}(Nincs releváns chat előzmény)")` helyett
# a return előtt kezelni, pl.:
# if not formatted_history_lines:
#     return f"{HISTORY_HEADER}\n  (Nincs releváns chat előzmény)\n\n"
# Vagy, ahogy most van a kódodban, ha üres, akkor csak ""-t ad vissza, ami jobb,
# mert akkor a build_chat_prompt filter(None, ...) része kiszűri.


# === FŐ PROMPT ÉPÍTŐ FÜGGVÉNY ===
def build_chat_prompt(
    stock_data: Optional[Any],
    history: List[Any], # Használjuk a ChatMessage típust, ha elérhető
    question: str,
    # Opcionális: Lehetőség más rendszersablon megadására
    system_template_file: Path = DEFAULT_CHAT_TEMPLATE_FILE
) -> str:
    """
    Összeállítja a végleges szöveges promptot az LLM számára, robusztus adatkezeléssel.

    Args:
        stock_data: A részvényadat objektum.
        history: Az előző üzenetek listája (ChatMessage objektumok).
        question: A felhasználó legutóbbi kérdése.
        system_template_file: A használni kívánt rendszerüzenet sablonfájl elérési útja.

    Returns:
        A teljesen összeállított prompt string, készen az LLM számára.

    Raises:
        ValueError: Ha a felhasználói kérdés üres vagy érvénytelen.
        RuntimeError: Ha alapvető prompt szekció formázása sikertelen.
    """
    # 1. Bemeneti Kérdés Validálása
    if not isinstance(question, str) or not question.strip():
        logger.error("Prompt építés sikertelen: A felhasználói kérdés üres vagy érvénytelen.")
        raise ValueError("A felhasználói kérdésnek nem üres stringnek kell lennie.")
    question = question.strip()

    logger.info(f"Chat prompt összeállítása (v5.0) a '{system_template_file.name}' sablonnal...")
    start_time = datetime.now(timezone.utc)

    # 2. Prompt Szekciók Biztonságos Összeállítása Segédfüggvényekkel
    try:
        # Rendszerüzenet betöltése sablonból
        system_message_content = _load_prompt_template(system_template_file, FALLBACK_SYSTEM_MESSAGE)
        # Opcionális: Helyettesíthető értékek a rendszerüzenetben, pl. dátum
        # system_message_content = system_message_content.replace("{current_date}", datetime.now(timezone.utc).strftime('%Y-%m-%d'))
        
        system_section: str = f"{SYS_MSG_HEADER}\n{system_message_content}\n"
        stock_context_section: str = _format_stock_data_for_prompt(stock_data) # Javított formázó
        history_section: str = _format_history_for_prompt(history)
        question_section: str = f"{QUESTION_HEADER}\nFELHASZNÁLÓ: {question}\n"
        guidance_section: str = f"{RESPONSE_GUIDANCE_HEADER}" # Egyszerű útmutatás, az LLM itt folytatja

    except Exception as e:
        logger.critical(f"KRITIKUS HIBA a prompt szekciók formázása közben: {e}", exc_info=True)
        # Itt érdemes lehet egy nagyon egyszerű, de még használható fallback promptot visszaadni,
        # ahelyett, hogy teljesen leállna az alkalmazás, ha a hiba nem fatális.
        # Vagy RuntimeErrort dobni, ahogy eredetileg.
        raise RuntimeError(f"Nem sikerült formázni a prompt szekciókat egy belső hiba miatt: {e}") from e

    # 3. Szekciók Kombinálása
    # Biztosítjuk a megfelelő elválasztást a szekciók között
    final_prompt_parts = [
        system_section.strip(),
        stock_context_section.strip(), # Ennek a végén már van \n\n
        history_section.strip(),       # Ennek is, ha van tartalom
        question_section.strip(),
        guidance_section.strip()       # Ez az utolsó, nem kell utána extra \n
    ]
    
    # Üres részek kiszűrése és összekapcsolása dupla sortöréssel
    final_prompt: str = "\n\n".join(filter(None, final_prompt_parts))

    # 4. Végső Logolás és Visszatérés
    end_time = datetime.now(timezone.utc)
    duration = (end_time - start_time).total_seconds()
    prompt_len = len(final_prompt)
    logger.info(f"Chat prompt sikeresen összeállítva {duration:.3f}s alatt. Hossz: {prompt_len} karakter.")
    
    # Részletes debug logolás (opcionális, fejlesztéshez hasznos)
    # if logger.isEnabledFor(logging.DEBUG):
    #    logger.debug(f"--- VÉGLEGES ÖSSZEÁLLÍTOTT PROMPT (max 1000 karakter) ---\n{final_prompt[:1000]}...\n--- PROMPT VÉGE ---")

    return final_prompt

# --- Segédfüggvény: Előzmények Formázása ---
def _format_history_for_prompt(history: List[Any]) -> str:
    """
    Formázza a chat előzményeket a prompt számára, figyelembe véve a legutóbbi üzeneteket.
    Biztonságosan kezeli a ChatMessage objektumokat.
    """
    formatted_history_lines: List[str] = []
    if not history or not isinstance(history, list):
        return "" # Nincs előzmény vagy érvénytelen formátum

    # Előzmények limitálása a settingsből vagy alapértelmezett értékkel
    history_limit: int = getattr(settings.AI, 'CHAT_HISTORY_MAX_MESSAGES_FOR_PROMPT', 5) if hasattr(settings, 'AI') else 5
    
    # Csak a releváns számú, legfrissebb üzenetet vesszük figyelembe
    relevant_messages = history[-history_limit:]
    
    processed_messages_count = 0
    for msg in relevant_messages:
        if msg is None: continue # Hibás üzenet átugrása

        role_raw = _safe_get_attr_or_key(msg, 'role')
        content_raw = str(_safe_get_attr_or_key(msg, 'content', '')).strip()

        role_str = "ISMERETLEN"
        # ChatRole enum használata, ha elérhető és helyesen importált
        if ChatRole is not Any and isinstance(role_raw, ChatRole): # Ha ChatRole enum típusú
            if role_raw == ChatRole.USER:
                role_str = "FELHASZNÁLÓ"
            elif role_raw == ChatRole.ASSISTANT:
                role_str = "FINBOT" # Vagy "ASSZISZTENS"
            # Lehetnek más szerepek is, pl. SYSTEM, FUNCTION
            else:
                role_str = str(role_raw.value).upper() if hasattr(role_raw, 'value') else str(role_raw).upper()

        elif isinstance(role_raw, str): # Ha a role stringként van tárolva
            role_lower = role_raw.lower()
            if role_lower == "user":
                role_str = "FELHASZNÁLÓ"
            elif role_lower == "assistant" or role_lower == "model" or role_lower == "finbot":
                role_str = "FINBOT"
            else:
                role_str = role_raw.upper()
        
        if content_raw: # Csak ha van tartalom
            formatted_history_lines.append(f"{role_str}: {content_raw}")
            processed_messages_count += 1

    if not formatted_history_lines:
        # Nem adunk hozzá fejlécet, ha nincs érdemi előzmény
        return ""
        # Vagy egy explicit üzenet:
        # return f"{HISTORY_HEADER}\n  (Nincsenek releváns előzmények)\n\n"

    # Előzmények összefűzése, fejléccel ellátva
    return f"{HISTORY_HEADER}\n" + "\n".join(formatted_history_lines) + "\n\n"

# === ÚJ, TÍPUSBIZTOS FORMÁZÓ ===
def _format_stock_data_from_model(model: FinBotStockResponse) -> str:
    """Formats the FinBotStockResponse model into a string for the prompt."""
    lines = []
    ticker = model.metadata.get("symbol", "N/A").upper() if model.metadata else "N/A"
    lines.append(STOCK_CONTEXT_HEADER_TPL.format(ticker=ticker))

    # Company Overview
    lines.append("--- Céginformáció és Profil ---")
    if model.company_overview:
        co = model.company_overview
        lines.append(f"  Cég neve: {co.name} ({co.symbol})")
        if co.sector: lines.append(f"  Szektor: {co.sector}")
        if co.industry: lines.append(f"  Iparág: {co.industry}")
        if co.market_cap: lines.append(f"  Piaci kapitalizáció: {_safe_format_large_number(co.market_cap)}")
        if co.long_business_summary: lines.append(f"  Leírás: {co.long_business_summary[:500]}...")
    else:
        lines.append("  Nem elérhető")

    # Latest Price
    lines.append("--- Legutóbbi Árfolyamadatok ---")
    if model.latest_ohlcv:
        lo = model.latest_ohlcv
        price_str = _safe_format_number(lo.close)
        change_str = f" ({_safe_format_number(lo.change_percent_day)}%)" if lo.change_percent_day is not None else ""
        lines.append(f"  Legutóbbi ár ({_format_timestamp(lo.time)}): {price_str}{change_str}")
        lines.append(f"  Napi tartomány: {_safe_format_number(lo.low)} - {_safe_format_number(lo.high)}")
        if lo.volume: lines.append(f"  Forgalom: {_safe_format_number(lo.volume, 0)}")
    else:
        lines.append("  Nem elérhető")

    # Financial Metrics
    lines.append("--- Pénzügyi Mutatók ---")
    if model.financials or model.earnings:
        if model.financials:
            fin = model.financials
            if fin.latest_annual_revenue: lines.append(f"  Éves bevétel: {_safe_format_large_number(fin.latest_annual_revenue)}")
            if fin.latest_annual_net_income: lines.append(f"  Éves nettó jövedelem: {_safe_format_large_number(fin.latest_annual_net_income)}")
        if model.earnings and model.earnings.annual_reports:
            latest_annual = model.earnings.annual_reports[0] if model.earnings.annual_reports else None
            if latest_annual and latest_annual.reported_eps: 
                lines.append(f"  Legutóbbi Éves EPS ({latest_annual.date}): {_safe_format_number(latest_annual.reported_eps)}")
    else:
        lines.append("  Nem elérhető")

    # Technical Analysis
    lines.append("--- Technikai Analízis (Legutóbbi Indikátorok) ---")
    if model.latest_indicators:
        for key, value in model.latest_indicators.items():
            if value is not None:
                lines.append(f"  {key.upper()}: {_safe_format_number(value)}")
    else:
        lines.append("  Nem elérhető")

    # News
    lines.append("--- Friss Hírek ---")
    if model.news:
        for i, news_item in enumerate(model.news[:3]):  # Maximum 3 hírt jelenítünk meg
            lines.append(f"  {i+1}. {news_item.title} ({news_item.publisher}) - {_format_timestamp(news_item.published_at)}")
    else:
        lines.append("  Nincsenek friss hírek.")

    # AI Analysis
    if model.ai_summary_hu:
        lines.append("--- Korábbi AI Elemzés Összefoglaló ---")
        summary = model.ai_summary_hu
        truncated_summary = summary[:750] + ("..." if len(summary) > 750 else "")
        lines.append(f"  {truncated_summary}")

    return "\n".join(lines).strip() + "\n\n"

# === FŐ PROMPT ÉPÍTŐ FÜGGVÉNYEK ===

def build_chat_prompt_from_model(
    stock_data_model: FinBotStockResponse,
    history: List[Any],
    question: str,
    system_template_file: Path = DEFAULT_CHAT_TEMPLATE_FILE
) -> str:
    """
    Típusbiztos prompt építő, ami a FinBotStockResponse modellt használja.
    """
    system_message = _load_prompt_template(system_template_file, FALLBACK_SYSTEM_MESSAGE)
    
    # 1. Rendszerüzenet (utasítások)
    prompt_parts = [SYS_MSG_HEADER, system_message, "\n"]
    
    # 2. Részvényadat kontextus (az új, típusbiztos formázóval)
    stock_context_str = _format_stock_data_from_model(stock_data_model)
    prompt_parts.append(stock_context_str)
    
    # 3. Beszélgetési előzmények
    history_str = _format_history_for_prompt(history)
    if history_str:
        prompt_parts.append(HISTORY_HEADER)
        prompt_parts.append(history_str)
    
    # 4. Felhasználói kérdés
    prompt_parts.append(QUESTION_HEADER)
    prompt_parts.append(question)
    
    # 5. Válasz fejléce
    prompt_parts.append("\n" + RESPONSE_GUIDANCE_HEADER)
    
    return "\n".join(prompt_parts).strip()

# === Példa a modul használatára (tesztelési célból) ===
if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logger.info("Prompt builder teszt futtatása...")

    # Hozz létre egy dummy settings.AI-t ha nincs rendes settings import
    if not hasattr(settings, 'AI'):
        class DummyAISettings:
            CHAT_HISTORY_MAX_MESSAGES_FOR_PROMPT = 3
            TRUNCATE_AI_SUMMARY_CHARS = 200
        settings.AI = DummyAISettings()
    if not hasattr(settings, 'NEWS'):
        class DummyNEWSSettings:
            MAX_ITEMS_FOR_PROMPT = 2
        settings.NEWS = DummyNEWSSettings()

    # Mock ChatMessage és ChatRole, ha az import nem sikerült
    if ChatMessage is Any:
        class MockChatMessage:
            def __init__(self, role: Union[str, Any], content: str):
                self.role = role
                self.content = content
        ChatMessage = MockChatMessage

        class MockChatRole: # String alapú enum szimuláció
            USER = "user"
            ASSISTANT = "assistant"
        ChatRole = MockChatRole


    # Dummy adatok
    mock_stock_data_full = {
        "symbol": "TESZT",
        "currency": "USD",
        "company_overview": {
            "name": "Teszt Vállalat Inc.",
            "sector": "Technológia",
            "industry": "Szoftverfejlesztés",
            "description": "Ez egy nagyon hosszú leírás a Teszt Vállalatról, amely bemutatja annak minden csodálatos aspektusát és jövőbeli terveit. " * 5,
            "market_cap": 1234567890.0,
            "currency": "USD"
        },
        "latest_ohlcv": {"close": 150.75, "time": datetime.now(timezone.utc).timestamp(), "volume": 1234567, "change_percent_day": 1.25},
        "financials": {
            "latest_annual_revenue": 5000000000,
            "latest_annual_net_income": 500000000,
            "total_assets": 10000000000,
            "report_date": "2023-12-31"
        },
        "latest_indicators": {"RSI": 65.5, "SMA20": 145.0},
        "news": [
            {"title": "Teszt Hír 1: Nagy Bejelentés", "published_at": "2024-01-15T10:00:00Z", "publisher": "Teszt Hírek"},
            {"title": "Teszt Hír 2: Piaci Reakciók", "published_at": 1705300000, "publisher_name": "Pénzügyi Figyelő"}, # Timestamp
            {"title": "Teszt Hír 3: Elemzői Vélemények", "datetime": "2024-01-13", "publisher": {"name": "Gazdasági Portál"}}, # Publisher mint objektum
        ],
        "ai_summary_hu": "Ez a Teszt Vállalat AI által generált magyar nyelvű összefoglalója. " * 10 + "Részletesen kitér a pénzügyi helyzetre és a piaci kilátásokra."
    }

    mock_stock_data_minimal = {
        "symbol": "MINIM",
        "latest_ohlcv": {"close": 10.0, "time": "2024-01-01T00:00:00Z"}
    }
    
    mock_stock_data_none = None

    mock_history = [
        ChatMessage(role=ChatRole.USER, content="Mi a véleményed a TESZT részvényről?"),
        ChatMessage(role=ChatRole.ASSISTANT, content="A TESZT részvény jelenleg erősnek tűnik az RSI alapján."),
        ChatMessage(role="user", content="És mi a helyzet a hírekkel?"), # String role tesztelése
    ]

    test_question = "Milyen kilátásai vannak a TESZT részvénynek rövid távon?"

    logger.info("\n--- Teljes Adatkészlettel ---")
    prompt1 = build_chat_prompt(mock_stock_data_full, mock_history, test_question)
    print(prompt1)

    logger.info("\n--- Minimális Adatkészlettel ---")
    prompt2 = build_chat_prompt(mock_stock_data_minimal, [], "Mi a helyzet a MINIM részvénnyel?")
    print(prompt2)
    
    logger.info("\n--- Nincs Adatkészlet (stock_data is None) ---")
    prompt3 = build_chat_prompt(mock_stock_data_none, [], "Mi a helyzet az XYZ részvénnyel?")
    print(prompt3)