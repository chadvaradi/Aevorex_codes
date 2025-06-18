# backend/core/ticker_tape_service.py

import httpx
import asyncio
import json
import traceback # Részletesebb hiba logoláshoz
from typing import List, Dict, Any, Optional, Tuple, Literal

# Core komponensek importálása
from modules.financehub.backend.config import settings # Központi, validált beállítások
from modules.financehub.backend.utils.logger_config import get_logger
from ..models.ticker_tape import TickerTapeItem, TickerTapeData
from .cache_service import CacheService

# Logger inicializálása a modulhoz
logger = get_logger(__name__)
MODULE_PREFIX = "[TickerTape Service]" # Log üzenetekhez prefix

# --- API Konfiguráció ---
# Válassz egy API típust - ez vezérli az URL-t és a feldolgozást
# Lehetséges értékek: 'FMP', 'ALPHA_VANTAGE' (vagy más, amit implementálsz)
# Ezt akár a settings-be is kitehetnéd, ha dinamikusabban akarod váltani.
# Most konstansként definiáljuk itt a példa kedvéért.
SELECTED_API_PROVIDER: Literal['FMP', 'ALPHA_VANTAGE', 'EODHD'] = 'EODHD'
# API Végpontok és Kulcsok (Szolgáltató függő)
API_CONFIG = {
    'FMP': {
        # FONTOS: Az FMP '/v3/quote/' végpontja ADJA a változást, a '/v3/quote-short/' NEM!
        'endpoint_template': "https://financialmodelingprep.com/api/v3/quote/{symbol}?apikey={api_key}",
        'api_key_getter': lambda: settings.API_KEYS.FMP.get_secret_value() if settings.API_KEYS.FMP else None,
        'response_parser': lambda data, symbol: parse_fmp_quote_response(data, symbol) # Külön függvény a parsoláshoz
    },
    'ALPHA_VANTAGE': {
        'endpoint_template': "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}",
        'api_key_getter': lambda: settings.API_KEYS.ALPHA_VANTAGE.get_secret_value() if settings.API_KEYS.ALPHA_VANTAGE else None,
        'response_parser': lambda data, symbol: parse_alpha_vantage_quote_response(data, symbol) # Külön függvény a parsoláshoz
    },
    'EODHD': {
        # EODHD real-time endpoint CSV formátumban ad adatokat
        # A {symbol} itt a TELJES szimbólum lesz (pl. AAPL.US)
        'endpoint_template': "https://eodhistoricaldata.com/api/real-time/{symbol}?api_token={api_key}&fmt=json",
        'api_key_getter': lambda: settings.API_KEYS.EODHD.get_secret_value() if settings.API_KEYS.EODHD else None,
        'response_parser': lambda data, symbol: parse_eodhd_realtime_response(data, symbol) # CSV parser függvény
    }
}

# --- API Válasz Feldolgozó Függvények ---

def parse_fmp_quote_response(api_response_data: Any, symbol: str) -> Optional[Dict[str, Any]]:
    """
    Feldolgozza a Financial Modeling Prep (FMP) /api/v3/quote/ végpontjának válaszát.
    Kinyeri a szükséges mezőket (symbol, price, change, changesPercentage).
    """
    log_prefix = f"{MODULE_PREFIX} [ParseFMP:{symbol}]"
    if not isinstance(api_response_data, list) or not api_response_data:
        logger.warning(f"{log_prefix} Unexpected API response format (expected non-empty list). Data: {str(api_response_data)[:150]}...")
        return None
    # Az FMP quote általában egy listát ad vissza, egyetlen szótárral benne
    quote_data = api_response_data[0]
    if not isinstance(quote_data, dict):
        logger.warning(f"{log_prefix} List item is not a dictionary. Data: {quote_data}")
        return None

    # Mezők kinyerése (a teljes /quote végpont ezt kellene adja)
    current_price_str = quote_data.get("price")
    change_str = quote_data.get("change")
    change_percent_str = quote_data.get("changesPercentage")

    if current_price_str is None or change_str is None or change_percent_str is None:
        # Ha a /quote-short végpontot használnád mégis, ez a hiba jönne elő
        logger.warning(f"{log_prefix} Missing essential fields (price, change, changesPercentage) in FMP API response. Check endpoint/plan. Data: {quote_data}")
        return None

    try:
        current_price = float(current_price_str)
        change = float(change_str)
        change_percent = float(change_percent_str)
    except (ValueError, TypeError) as conv_err:
        logger.warning(f"{log_prefix} Failed to convert FMP API values to numbers. Error: {conv_err}. Data: {quote_data}")
        return None

    return {
        "symbol": symbol,
        "price": round(current_price, 4), # Több tizedes a pontossághoz?
        "change": round(change, 4),
        "change_percent": round(change_percent, 2)
    }

def parse_alpha_vantage_quote_response(api_response_data: Any, symbol: str) -> Optional[Dict[str, Any]]:
    """
    Feldolgozza az Alpha Vantage GLOBAL_QUOTE végpontjának válaszát.
    Kinyeri a szükséges mezőket (symbol, price, change, change percent).
    """
    log_prefix = f"{MODULE_PREFIX} [ParseAV:{symbol}]"
    if not isinstance(api_response_data, dict):
        logger.warning(f"{log_prefix} Unexpected API response format (expected dictionary). Data: {str(api_response_data)[:150]}...")
        return None

    quote_data = api_response_data.get("Global Quote")
    if not quote_data or not isinstance(quote_data, dict):
        logger.warning(f"{log_prefix} Missing 'Global Quote' object in Alpha Vantage response. Data: {api_response_data}")
        return None

    # Mezők kinyerése AV kulcsokkal
    symbol_api = quote_data.get("01. symbol")
    current_price_str = quote_data.get("05. price")
    change_str = quote_data.get("09. change")
    change_percent_str = quote_data.get("10. change percent") # String '%' jellel

    if symbol_api != symbol: # Ellenőrzés
         logger.warning(f"{log_prefix} Mismatched symbol in response. Expected '{symbol}', got '{symbol_api}'.")
         # Dönthetsz úgy, hogy ettől még feldolgozod, vagy None-t adsz vissza

    if current_price_str is None or change_str is None or change_percent_str is None:
        logger.warning(f"{log_prefix} Missing essential fields (price, change, change percent) in Alpha Vantage API response. Data: {quote_data}")
        return None

    try:
        current_price = float(current_price_str)
        change = float(change_str)
        # A százalék jel eltávolítása konverzió előtt
        change_percent = float(change_percent_str.rstrip('%'))
    except (ValueError, TypeError, AttributeError) as conv_err:
        logger.warning(f"{log_prefix} Failed to convert Alpha Vantage API values to numbers. Error: {conv_err}. Data: {quote_data}")
        return None

    return {
        "symbol": symbol, # Az eredeti szimbólumot használjuk
        "price": round(current_price, 4),
        "change": round(change, 4),
        "change_percent": round(change_percent, 2)
    }

def parse_eodhd_realtime_response(api_response_data: Any, full_symbol: str) -> Optional[Dict[str, Any]]:
    """Feldolgozza az EODHD /real-time/ végpont CSV vagy JSON válaszát."""
    log_prefix = f"{MODULE_PREFIX} [ParseEODHD:{full_symbol}]"
    
    # Először megpróbáljuk JSON-ként kezelni
    if isinstance(api_response_data, dict):
        # JSON válasz
        try:
            symbol_api = api_response_data.get("code")
            current_price_str = api_response_data.get("close")
            change_str = api_response_data.get("change")
            change_percent_str = api_response_data.get("change_p")
            
            # Szimbólum ellenőrzés
            if symbol_api != full_symbol:
                logger.warning(f"{log_prefix} Mismatched symbol in JSON response. Expected '{full_symbol}', got '{symbol_api}'.")
            
            if not all([current_price_str, change_str, change_percent_str]):
                logger.warning(f"{log_prefix} Missing essential fields (close, change, change_p) in EODHD JSON response. Data: {api_response_data}")
                return None

            # Numerikus konverzió
            current_price = float(current_price_str)
            change = float(change_str)
            change_percent = float(change_percent_str)
            
            return {
                "symbol": full_symbol,
                "price": round(current_price, 4),
                "change": round(change, 4),
                "change_percent": round(change_percent, 2)
            }
            
        except (ValueError, TypeError, KeyError) as conv_err:
            logger.warning(f"{log_prefix} Failed to parse EODHD JSON response. Error: {conv_err}. Data: {api_response_data}")
            return None
    
    # Ha nem dict, akkor próbáljuk CSV-ként
    if not isinstance(api_response_data, str):
        logger.warning(f"{log_prefix} Unexpected API response format (expected JSON dict or CSV string). Data: {str(api_response_data)[:150]}...")
        return None

    try:
        # CSV sorok beolvasása
        lines = api_response_data.strip().split('\n')
        if len(lines) < 2:
            logger.warning(f"{log_prefix} CSV response has insufficient lines. Expected header + data. Data: {api_response_data[:100]}...")
            return None
        
        # Header és data sor
        header_line = lines[0]
        data_line = lines[1]
        
        # CSV parsing
        header_fields = header_line.split(',')
        data_fields = data_line.split(',')
        
        if len(header_fields) != len(data_fields):
            logger.warning(f"{log_prefix} CSV header and data field count mismatch. Header: {len(header_fields)}, Data: {len(data_fields)}")
            return None
        
        # Mezők mapping
        data_dict = dict(zip(header_fields, data_fields))
        
        # Szükséges mezők kinyerése
        symbol_api = data_dict.get("code")
        current_price_str = data_dict.get("close")
        change_str = data_dict.get("change")
        change_percent_str = data_dict.get("change_p")
        
        # Szimbólum ellenőrzés
        if symbol_api != full_symbol:
            logger.warning(f"{log_prefix} Mismatched symbol in response. Expected '{full_symbol}', got '{symbol_api}'.")
        
        if not all([current_price_str, change_str, change_percent_str]):
            logger.warning(f"{log_prefix} Missing essential fields (close, change, change_p) in EODHD CSV response. Data: {data_dict}")
            return None

        # Numerikus konverzió
        current_price = float(current_price_str)
        change = float(change_str)
        change_percent = float(change_percent_str)
        
        return {
            "symbol": full_symbol,
            "price": round(current_price, 4),
            "change": round(change, 4),
            "change_percent": round(change_percent, 2)
        }
        
    except (ValueError, TypeError, IndexError) as conv_err:
        logger.warning(f"{log_prefix} Failed to parse EODHD CSV response. Error: {conv_err}. Data: {api_response_data[:200]}...")
        return None

# --- Utility Functions ---

def normalize_symbol_for_provider(symbol: str, provider: str) -> str:
    """
    Normalizálja a szimbólumot a kiválasztott API szolgáltató szerint.
    
    Args:
        symbol: Az eredeti szimbólum (pl. "AAPL")
        provider: A szolgáltató neve (pl. "EODHD")
        
    Returns:
        A normalizált szimbólum (pl. "AAPL.US" EODHD-hoz)
    """
    if provider == 'EODHD':
        # Index symbols (e.g., ^GSPC) are passed through unchanged – EODHD supports many of them
        if symbol.startswith('^'):
            return symbol
        # US ticker-ekhez automatikusan hozzáadjuk a .US végződést
        if '.' not in symbol and not symbol.startswith('^') and not '=' in symbol:
            # Egyszerű szimbólumok (AAPL, MSFT, stb.) -> AAPL.US
            return f"{symbol}.US"
        elif '=' in symbol:
            # Forex párok (EURHUF=X) -> maradnak ugyanazok  
            return symbol
        else:
            # Már van pont benne (OTP.BD) -> marad ugyanaz
            return symbol
    else:
        # Más provider-ek esetén nem módosítjuk
        return symbol

def get_original_symbol(full_symbol: str, provider: str) -> str:
    """
    Visszaadja az eredeti szimbólumot a provider-specifikus formátumból.
    
    Args:
        full_symbol: A provider-specifikus szimbólum (pl. "AAPL.US")
        provider: A szolgáltató neve
        
    Returns:
        Az eredeti szimbólum (pl. "AAPL")
    """
    if provider == 'EODHD' and full_symbol.endswith('.US'):
        # .US végződést eltávolítjuk US ticker-eknél
        return full_symbol[:-3]
    else:
        return full_symbol

# --- Fő Lekérdező Függvény (Egy Tickerhez) ---

async def fetch_single_ticker_quote(
    symbol: str,
    client: httpx.AsyncClient,
    provider_config: Dict[str, Any] # A kiválasztott API configja
) -> Optional[Dict[str, Any]]:
    """
    Lekér egyetlen tickerhez tartozó minimális árfolyamadatot a konfigurált
    API szolgáltatótól aszinkron módon.

    Args:
        symbol: A lekérdezendő ticker szimbólum (pl. "AAPL").
        client: Az aszinkron HTTP kliens a kéréshez.
        provider_config: A kiválasztott API szolgáltató konfigurációja
                         (endpoint_template, api_key_getter, response_parser).

    Returns:
        Egy szótár a ticker adataival (pl. {"symbol": "AAPL", "price": ...}),
        vagy None, ha a lekérdezés vagy feldolgozás sikertelen.
    """
    log_prefix = f"{MODULE_PREFIX} [Fetch:{symbol}]"

    # Konfiguráció és API kulcs lekérése
    endpoint_template = provider_config.get('endpoint_template')
    api_key_getter = provider_config.get('api_key_getter')
    response_parser = provider_config.get('response_parser')

    if not all([endpoint_template, api_key_getter, response_parser]):
        logger.critical(f"{log_prefix} Invalid provider configuration passed. Missing template, getter or parser.")
        return None # Vagy dobhatna kivételt

    api_key = api_key_getter()
    if not api_key:
        logger.error(f"{log_prefix} API Key for provider '{SELECTED_API_PROVIDER}' is missing in settings. Cannot fetch quote.")
        return None

    # Szimbólum normalizálása a provider szerint
    api_symbol = normalize_symbol_for_provider(symbol, SELECTED_API_PROVIDER)
    logger.debug(f"{log_prefix} Normalized symbol '{symbol}' -> '{api_symbol}' for provider {SELECTED_API_PROVIDER}")

    url = endpoint_template.format(symbol=api_symbol, api_key=api_key)
    # Logolás API kulcs nélkül a biztonság kedvéért
    logged_url = endpoint_template.format(symbol=api_symbol, api_key='***REDACTED***')
    logger.debug(f"{log_prefix} Requesting quote from URL: {logged_url}")

    try:
        response = await client.get(url)
        # Státuszkód ellenőrzése (4xx, 5xx hibát dob)
        response.raise_for_status()

        # Válasz feldolgozása provider szerint
        if SELECTED_API_PROVIDER == 'EODHD':
            # EODHD JSON vagy CSV választ adhat
            try:
                # Először próbáljuk JSON-ként
                api_response_data = response.json()
                logger.debug(f"{log_prefix} Received {response.status_code} OK. Raw JSON response (truncated): {str(api_response_data)[:200]}...")
            except json.JSONDecodeError:
                # Ha nem JSON, akkor CSV
                api_response_data = response.text
                logger.debug(f"{log_prefix} Received {response.status_code} OK. Raw CSV response (truncated): {str(api_response_data)[:200]}...")
        else:
            # JSON válasz beolvasása más provider-eknél
            api_response_data = response.json()
            logger.debug(f"{log_prefix} Received {response.status_code} OK. Raw response (truncated): {str(api_response_data)[:200]}...")

        # Adatok parsolása a szolgáltató-specifikus függvénnyel
        parsed_data = response_parser(api_response_data, api_symbol)

        if parsed_data is None:
            # A parser már logolta a hibát/warningot
            logger.warning(f"{log_prefix} Parsing failed or returned no data.")
            return None
        else:
            # Az eredeti szimbólumot használjuk a válaszban
            parsed_data["symbol"] = symbol
            logger.info(f"{log_prefix} Successfully processed quote.")
            return parsed_data

    # Részletes hibakezelés
    except httpx.RequestError as exc:
        logger.error(f"{log_prefix} Network error during API request to {logged_url}. Error: {exc.__class__.__name__} - {exc}")
        return None
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        response_text = str(exc.response.text)[:200] # Rövidített válasz logoláshoz
        if status_code in [401, 403]:
            logger.error(f"{log_prefix} API Authentication/Authorization error ({status_code}) for {logged_url}. Check API key or plan limitations. Response: {response_text}...")
        elif status_code == 429:
            logger.warning(f"{log_prefix} API Rate Limit Exceeded ({status_code}) for {logged_url}. Consider increasing interval or upgrading plan. Response: {response_text}...")
        elif 400 <= status_code < 500:
            logger.warning(f"{log_prefix} Client-side API error ({status_code}) for {logged_url}. Possibly invalid symbol or request. Response: {response_text}...")
        else: # 5xx hibák
             logger.error(f"{log_prefix} Server-side API error ({status_code}) for {logged_url}. Provider issue? Response: {response_text}...")
        return None
    except json.JSONDecodeError as exc:
        # JSON decode hiba - ez már kezelve van a EODHD blokkon belül
        logger.error(f"{log_prefix} Failed to decode JSON response from API at {logged_url}. Invalid JSON received. Error: {exc}. Response: {str(response.text)[:200]}...")
        return None
    except Exception as exc:
        # Minden egyéb váratlan hiba
        logger.exception(f"{log_prefix} An unexpected error occurred during fetch or processing from {logged_url}: {exc}")
        return None


# --- Fő Cache Frissítő Függvény ---

async def update_ticker_tape_data_in_cache(
    client: httpx.AsyncClient,
    cache: CacheService
) -> bool:
    """
    Aszinkron módon lekérdezi az árfolyamadatokat a konfigurációban megadott
    ticker szimbólumok listájához a kiválasztott API szolgáltatóval,
    és az eredményt elmenti a CacheService-be.

    Args:
        client: Az aszinkron HTTP kliens példány a külső API hívásokhoz.
        cache: A CacheService példány az adatok tárolásához.

    Returns:
        True, ha legalább egy tickerhez sikeresen lekérdezte és elmentette az adatokat,
        egyébként False.
    """
    log_prefix = f"{MODULE_PREFIX} [Update Task]"
    logger.info(f"{log_prefix} Task execution started using provider: {SELECTED_API_PROVIDER}.")

    # 1. Konfiguráció és Kiválasztott API Adatok Lekérése
    try:
        symbols: List[str] = settings.TICKER_TAPE.SYMBOLS
        cache_key: str = settings.TICKER_TAPE.CACHE_KEY
        cache_ttl: int = settings.TICKER_TAPE.CACHE_TTL_SECONDS

        provider_config = API_CONFIG.get(SELECTED_API_PROVIDER)
        if not provider_config:
             logger.critical(f"{log_prefix} Invalid API provider '{SELECTED_API_PROVIDER}' selected or not configured in API_CONFIG.")
             return False

        # Ellenőrizzük az API kulcs meglétét a settingsben (a getter csak később hívódik)
        # Ez segít korai hibajelzésben
        api_key_temp_check = provider_config['api_key_getter']()
        if not api_key_temp_check:
             logger.critical(f"{log_prefix} Required API key for provider '{SELECTED_API_PROVIDER}' is MISSING in settings.API_KEYS. Cannot proceed.")
             return False

        if not symbols:
            logger.warning(f"{log_prefix} No symbols configured in settings.TICKER_TAPE.SYMBOLS. Task finished, nothing to update.")
            return True # Technikailag nem hiba, csak nincs munka

        logger.info(f"{log_prefix} Preparing to update {len(symbols)} symbols. Cache key: '{cache_key}', TTL: {cache_ttl}s.")
        logger.debug(f"{log_prefix} Symbols to fetch: {symbols}")

    except AttributeError as e:
        logger.critical(f"{log_prefix} Configuration error accessing settings: {e}. Check config.py models and .env variables.", exc_info=True)
        return False # Nem tudunk futni hibás konfigurációval
    except Exception as e:
        logger.critical(f"{log_prefix} Unexpected error during configuration setup: {e}", exc_info=True)
        return False

    # 2. Párhuzamos Adatlekérdezés (asyncio.gather)
    fetch_tasks = [
        # Minden task megkapja a saját szimbólumát, a klienst és a KIVÁLASZTOTT szolgáltató configját
        fetch_single_ticker_quote(symbol, client, provider_config) for symbol in symbols
    ]

    results: List[Optional[Dict[str, Any]]] = []
    try:
        logger.debug(f"{log_prefix} Starting parallel fetch for {len(fetch_tasks)} tasks...")
        # return_exceptions=True hasznos lehet, ha látni akarod a kivételeket a gather listában,
        # de most a None-ra szűrés elegendő, mert a fetch_single... kezeli a saját hibáit.
        results = await asyncio.gather(*fetch_tasks, return_exceptions=False)
        logger.debug(f"{log_prefix} asyncio.gather completed.")
    except Exception as gather_err:
        logger.exception(f"{log_prefix} Unexpected error during asyncio.gather execution: {gather_err}")
        # Lehet, hogy itt False-t kellene visszaadni, mert a lekérdezés megszakadt
        return False

    # 3. Eredmények Összegzése és Szűrése
    valid_data: List[Dict[str, Any]] = [item for item in results if isinstance(item, dict)] # Biztosan dict-eket gyűjtünk
    successful_count = len(valid_data)
    failed_count = len(symbols) - successful_count

    logger.info(f"{log_prefix} Fetch summary: Successful symbols={successful_count}, Failed/Skipped symbols={failed_count}, Total symbols attempted={len(symbols)}.")

    if not valid_data:
        logger.warning(f"{log_prefix} No valid data could be fetched for any symbol. Cache will not be updated. Task considered failed.")
        return False # Explicit jelezzük, hogy a frissítés nem történt meg

    # 4. Adatok Mentése a Cache-be
    try:
        logger.debug(f"{log_prefix} Attempting to write {successful_count} items to cache key '{cache_key}' with TTL {cache_ttl}s.")
        await cache.set(
            key=cache_key,
            value=valid_data, # A sikeresen lekérdezett és parsolt adatok listája
            timeout_seconds=cache_ttl
        )
        logger.info(f"{log_prefix} Successfully updated cache key '{cache_key}' with {successful_count} ticker items.")
        # Sikeres volt a cache írás, és legalább egy adatot lekértünk és feldolgoztunk
        return True
    except Exception as cache_err:
        logger.error(f"{log_prefix} Failed to write data to cache key '{cache_key}'. Cache Service Error: {cache_err}", exc_info=True)
        # Annak ellenére, hogy adatot gyűjtöttünk, a cache írása sikertelen volt, így a teljes művelet nem sikeres.
        return False

# --- Modul betöltés jelzése ---
logger.info(f"{MODULE_PREFIX} Service module loaded and configured for provider: {SELECTED_API_PROVIDER}.")