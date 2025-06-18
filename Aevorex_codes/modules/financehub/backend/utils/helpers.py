# backend/utils/helpers.py
"""
Általános célú segédfüggvények az Aevorex FinBot backend alkalmazáshoz.

Ez a modul alapvető adat tisztítási, konverziós, validálási, DataFrame
manipulációs és dátum/idő kezelési funkciókat biztosít, amelyeket a rendszer
más részei (pl. service réteg, data mappers, Pydantic modellek) széles körben
használhatnak fel az adatok megbízható feldolgozása során.
A cél a robusztus, jól logolt és könnyen karbantartható segédfüggvények biztosítása.

Verzió: v1.2 - Consistent Logging and Robust URL Normalization
"""

# --- Alapvető Importok ---
import logging
import math      # Számításokhoz, NaN/Inf ellenőrzéshez
import re        # Reguláris kifejezésekhez (URL, string validáció)
import unicodedata # Opcionális Unicode normalizáláshoz stringekben
from datetime import datetime, timezone, tzinfo # Dátum- és időkezelés
from typing import Any, Optional, Union, List, Callable, Dict # Típus annotációk
import hashlib
import json
from urllib.parse import urlsplit, urlunsplit, quote, parse_qs, urlencode

# --- Harmadik Féltől Származó Importok ---
import pandas as pd # Kulcsfontosságú adatmanipulációhoz és dátumkezeléshez
from pydantic import HttpUrl, ValidationError # URL validáláshoz

# --- Projekt Specifikus Importok ---
# Kísérlet a központi logger konfiguráció betöltésére, standard logging fallbackkel
try:
    # JAVÍTÁS: Csak EGYSZER importáljuk és hozzuk létre a konfigurált loggert
    from modules.financehub.backend.utils.logger_config import get_logger # Vagy a megfelelő relatív import
    package_logger = get_logger(f"aevorex_finbot.{__name__}") # Használjuk ezt a nevet következetesen
    package_logger.info(f"Project-specific logger configured successfully for helpers module ({__name__}).")
except ImportError:
    # logging már importálva van fent
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    package_logger = logging.getLogger(f"aevorex_finbot.helpers_fallback.{__name__}") # Egyedi név a fallbacknek is
    package_logger.warning(f"Could not import get_logger from logger_config. Using fallback basicConfig logger for helpers module ({__name__}).")

# --- Modul Szintű Konstansok ---

# Minimális elfogadható Unix timestamp (másodpercben), az 1990-01-01 00:00:00 UTC időpont alapján.
MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS: float
try:
    MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS = pd.Timestamp('1990-01-01 00:00:00', tz='UTC').timestamp()
    package_logger.debug(f"Minimum valid timestamp threshold set to: {MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS} seconds (approx. 1990-01-01 UTC).")
except Exception as e:
    MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS = 631152000.0 # 1990-01-01 00:00:00 UTC
    package_logger.error(f"Could not determine minimum valid timestamp using pandas, defaulting to {MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS}. Error: {e}", exc_info=True)

FETCH_FAILED_MARKER: str = "FETCH_FAILED_V1"
FETCH_FAILURE_CACHE_TTL: int = 60 * 10       # 10 perc másodpercben

# --- Alapvető Tisztító és Parser Függvények ---

def _clean_value(value: Any, *, context: str = "") -> Optional[Any]:
    """
    Tisztítja és validálja a bemeneti értéket. Eltávolítja a placeholder
    értékeket (None, NaN, Inf, üres/specifikus placeholder stringek).
    Stringek esetén a whitespace-től mentesített verziót adja vissza.
    Más típusokat változatlanul ad vissza, ha nem None/NaN/Inf.
    """
    log_prefix = f"[{context}] " if context and context.strip() else ""
    # package_logger.debug(f"{log_prefix}_clean_value: Input value: '{value}' (Type: {type(value)})") # Lehet túl verbose

    if value is None or pd.isna(value):
        # package_logger.debug(f"{log_prefix}_clean_value: Value is None or pandas NA/NaT. Returning None.")
        return None

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            # package_logger.debug(f"{log_prefix}_clean_value: Value is float NaN or Inf. Returning None.")
            return None
        # package_logger.debug(f"{log_prefix}_clean_value: Value is valid float: {value}. Returning as is.")
        return value

    if isinstance(value, str):
        stripped_value = value.strip()
        if not stripped_value:
            # package_logger.debug(f"{log_prefix}_clean_value: Value is an empty string after strip. Returning None.")
            return None
        placeholder_strings = {
            'none', 'na', 'n/a', '-', '', '#n/a', 'null',
            'nan', 'nat', 'undefined', 'nil', '(blank)', '<na>'
        }
        if stripped_value.lower() in placeholder_strings:
            # package_logger.debug(f"{log_prefix}_clean_value: Value '{stripped_value}' matches a placeholder string. Returning None.")
            return None
        # package_logger.debug(f"{log_prefix}_clean_value: Value is valid string: '{stripped_value}'. Returning stripped value.")
        return stripped_value

    # package_logger.debug(f"{log_prefix}_clean_value: Value type {type(value)} not explicitly handled for string/float cleaning, returning as is: {value}")
    return value

def parse_optional_float(value: Any, *, context: str = "") -> Optional[float]:
    """
    Biztonságosan megpróbál egy értéket float típusúvá konvertálni, tisztítás után.
    Kezeli a pénznem jeleket, ezres elválasztókat, zárójeles negatív számokat,
    százalékjelet és K/M/B/T szuffixumokat.
    """
    log_prefix = f"[{context}] " if context and context.strip() else ""
    # package_logger.debug(f"{log_prefix}parse_optional_float: Received value '{value}' (type: {type(value)}) for float parsing.")
    cleaned_value = _clean_value(value, context=f"{log_prefix}_clean_value_for_float")
    if cleaned_value is None:
        # package_logger.debug(f"{log_prefix}parse_optional_float: Value became None after _clean_value. Original: '{value}'.")
        return None

    try:
        float_val: float
        if isinstance(cleaned_value, str):
            processed_str = cleaned_value
            # Pénznemjelek és ezreselválasztók eltávolítása
            processed_str = re.sub(r'[$\u20AC\u00A3\u00A5,]', '', processed_str).strip()
            # Zárójeles negatív számok kezelése: (123.45) -> -123.45
            if processed_str.startswith('(') and processed_str.endswith(')'):
                processed_str = '-' + processed_str[1:-1]
            
            # Százalékjel eltávolítása (a számot nem osztjuk 100-zal itt, azt a hívónak kell megtennie, ha szükséges)
            # Ha a cél a numerikus érték kinyerése, akkor a %-ot el kell távolítani.
            # Ha a % azt jelenti, hogy osztani kell 100-zal, azt itt nem tesszük meg automatikusan.
            if processed_str.endswith('%'):
                 processed_str = processed_str[:-1].strip()

            multipliers = {'k': 1e3, 'm': 1e6, 'b': 1e9, 't': 1e12}
            last_char = processed_str[-1:].lower() if processed_str else ''

            if last_char in multipliers and len(processed_str) > 1:
                num_part_str = processed_str[:-1]
                is_potentially_numeric = re.match(r"^-?\d*\.?\d+$", num_part_str) # Egyszerűsített ellenőrzés
                if is_potentially_numeric:
                    try:
                        num_part = float(num_part_str)
                        float_val = num_part * multipliers[last_char]
                        package_logger.debug(f"{log_prefix}parse_optional_float: Parsed string '{cleaned_value}' with multiplier '{last_char}' to {float_val}.")
                    except ValueError:
                         package_logger.debug(f"{log_prefix}parse_optional_float: Invalid numeric part '{num_part_str}' for multiplier. Original: '{value}'")
                         return None 
                else:
                    # Ha a szorzó előtti rész nem tűnik számnak, megpróbáljuk az egészet float-tá alakítani.
                    # Ez kezelheti azokat az eseteket, ahol pl. 'M' egy valuta kód része.
                    package_logger.debug(f"{log_prefix}parse_optional_float: Part before multiplier '{last_char}' ('{num_part_str}') not purely numeric. Attempting float conversion on '{processed_str}'.")
                    float_val = float(processed_str) # Ez valószínűleg ValueError-t dob, ha a multiplier nem volt valós
            else:
                 float_val = float(processed_str)
        elif isinstance(cleaned_value, (int, float)): # Már szám
            float_val = float(cleaned_value)
        else: # Nem string és nem szám, pl. bool
            package_logger.debug(f"{log_prefix}parse_optional_float: Value '{cleaned_value}' (type: {type(cleaned_value)}) is not string or numeric. Cannot convert to float. Original: '{value}'.")
            return None


        if math.isnan(float_val) or math.isinf(float_val):
            package_logger.debug(f"{log_prefix}parse_optional_float: Conversion of '{value}' resulted in NaN/Infinity. Returning None.")
            return None
        # package_logger.debug(f"{log_prefix}parse_optional_float: Successfully parsed '{value}' to float: {float_val}.")
        return float_val

    except (ValueError, TypeError) as error:
        # Csak akkor logoljunk, ha nem egyértelmű placeholder volt eredetileg
        is_placeholder_original = False
        if isinstance(value, str):
            placeholder_strings = {'none', 'na', 'n/a', '-', '', '#n/a', 'null', 'nan', 'nat', 'undefined', 'nil', '(blank)', '<na>'}
            if value.strip().lower() in placeholder_strings:
                 is_placeholder_original = True
        
        if not is_placeholder_original: # Ne logoljunk hibaként, ha az eredeti érték egy ismert placeholder volt
             package_logger.debug(f"{log_prefix}parse_optional_float: Could not parse '{value}' (cleaned: '{cleaned_value}', type: {type(value)}) to float. Error: {error}", exc_info=False)
        return None
    except Exception as unexpected_error: # Bármilyen más, nem várt hiba
        package_logger.error(f"{log_prefix}parse_optional_float: Unexpected error parsing '{value}' to float: {unexpected_error}", exc_info=True)
        return None


def parse_optional_int(value: Any, *, context: str = "") -> Optional[int]:
    """
    Biztonságosan megpróbál egy értéket int típusúvá konvertálni (float-on keresztül).
    Ellenőrzi, hogy a float érték lényegében egész szám-e toleranciával.
    """
    log_prefix = f"[{context}] " if context and context.strip() else ""
    float_val = parse_optional_float(value, context=f"{log_prefix}parse_float_for_int")
    if float_val is None:
        return None

    tolerance = 1e-9 
    if abs(float_val - round(float_val)) < tolerance:
        try:
            int_val = int(round(float_val))
            # package_logger.debug(f"{log_prefix}parse_optional_int: Successfully parsed '{value}' to int: {int_val}.")
            return int_val
        except (ValueError, TypeError, OverflowError) as error: # OverflowError is fontos lehet
             package_logger.warning(f"{log_prefix}parse_optional_int: Could not convert rounded float {round(float_val)} (from original value '{value}') to int. Error: {error}", exc_info=False)
             return None
    else:
         package_logger.debug(f"{log_prefix}parse_optional_int: Value '{value}' (parsed as float: {float_val}) is not considered a whole number within tolerance. Not converting to int.")
         return None

# --- Dátum és Idő Segédfüggvények ---

def parse_string_to_aware_datetime(
    value: Any,
    *,
    context: str = "",
    target_tz: tzinfo = timezone.utc
) -> Optional[datetime]:
    """
    Különböző bemeneti formátumokból (string, int/float timestamp, datetime)
    "aware" Python datetime objektumot hoz létre, a megadott cél időzónában (alapértelmezetten UTC).
    """
    log_prefix = f"[{context}] " if context and context.strip() else ""
    # package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Received value '{value}' (type: {type(value)}) for datetime parsing.")
    
    cleaned_value = _clean_value(value, context=f"{log_prefix}_clean_value_for_aware_dt")
    if cleaned_value is None:
        # package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Value became None after _clean_value. Original: '{value}'.")
        return None

    dt_object: Optional[datetime] = None

    try:
        if isinstance(cleaned_value, datetime):
            dt_object = cleaned_value
            package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Input is datetime object: {dt_object}")

        elif isinstance(cleaned_value, (int, float)):
            numeric_ts = float(cleaned_value)
            if numeric_ts < MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS:
                package_logger.warning(
                    f"{log_prefix}parse_string_to_aware_datetime: Numeric timestamp {numeric_ts:.3f} is below threshold "
                    f"(min: {MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS}). Original: '{value}'. Returning None."
                )
                return None
            dt_object = datetime.fromtimestamp(numeric_ts, tz=timezone.utc)
            package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Parsed numeric TS '{numeric_ts}' to UTC datetime: {dt_object}")

        elif isinstance(cleaned_value, str):
            # package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Attempting to parse string: '{cleaned_value}'")
            parsed_from_string = False
            # 1. Próba: pd.to_datetime (robusztus)
            try:
                # infer_datetime_format=True gyorsíthat, dayfirst=False a gyakoribb formátumokhoz
                # utc=True biztosítja, hogy ha naiv string, akkor UTC-ként értelmeződjön, és az eredmény UTC aware legyen.
                pd_ts = pd.to_datetime(cleaned_value, errors='coerce', utc=True, infer_datetime_format=True, dayfirst=False)
                if pd.isna(pd_ts): # NaT (Not a Time)
                    package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: pd.to_datetime returned NaT for string: '{cleaned_value}'. Trying specific formats.")
                else:
                    dt_object = pd_ts.to_pydatetime() # Python datetime objektummá
                    # Mivel utc=True, dt_object.tzinfo már timezone.utc (vagy ekvivalens)
                    parsed_from_string = True
                    package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Parsed string '{cleaned_value}' using pd.to_datetime to UTC: {dt_object}")
            except Exception as pd_err:
                package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: pd.to_datetime failed for '{cleaned_value}': {pd_err}. Trying specific formats.")

            if not parsed_from_string:
                # 2. Próba: datetime.fromisoformat (Python 3.7+)
                try:
                    iso_string_to_parse = cleaned_value
                    # A fromisoformat a 'Z'-t is kezeli Python 3.7+ verziókban, de a +00:00 biztonságosabb lehet
                    # if iso_string_to_parse.endswith('Z'):
                    #    iso_string_to_parse = iso_string_to_parse[:-1] + '+00:00'
                    dt_object = datetime.fromisoformat(iso_string_to_parse.replace('Z', '+00:00')) # Replace Z for broad compatibility
                    parsed_from_string = True
                    package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Parsed string '{cleaned_value}' using fromisoformat: {dt_object}")
                except ValueError:
                    # 3. Próba: strptime formátumok listája
                    common_formats = [
                        '%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z', # ISO with TZ
                        '%Y-%m-%d %H:%M:%S.%f%z', '%Y-%m-%d %H:%M:%S%z', # Common with TZ
                        '%Y-%m-%dT%H:%M:%S.%f',   '%Y-%m-%dT%H:%M:%S',   # ISO naive
                        '%Y-%m-%d %H:%M:%S.%f',   '%Y-%m-%d %H:%M:%S',   # Common naive
                        '%Y-%m-%d',                                       # Date only
                        '%m/%d/%Y %H:%M:%S',      '%m/%d/%Y',             # US format
                        '%d.%m.%Y %H:%M:%S',      '%d.%m.%Y',             # EU format
                    ]
                    for fmt in common_formats:
                        try:
                            dt_object = datetime.strptime(cleaned_value, fmt)
                            parsed_from_string = True
                            package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Parsed string '{cleaned_value}' with strptime format '{fmt}': {dt_object}")
                            break # Sikeres parse, kilépünk a ciklusból
                        except ValueError:
                            continue # Próbáljuk a következő formátumot
            
            if not parsed_from_string and dt_object is None: # Ha semmi sem sikerült
                package_logger.warning(f"{log_prefix}parse_string_to_aware_datetime: Could not parse string '{cleaned_value}' with any method. Original value: '{value}'.")
                return None
        else: # Nem datetime, nem int/float, nem string
            package_logger.warning(f"{log_prefix}parse_string_to_aware_datetime: Unsupported input type '{type(cleaned_value).__name__}' for datetime parsing. Original value: '{value}'.")
            return None

        # Időzóna kezelése és konverzió a target_tz-re
        if dt_object:
            aware_dt: datetime
            if dt_object.tzinfo is None or dt_object.tzinfo.utcoffset(dt_object) is None:
                # Naiv datetime objektum. Feltételezzük, hogy UTC, és lokalizáljuk.
                # Fontos, ha strptime-ból jött egy naiv formátummal, vagy ha a pandas nem tette aware-ra (bár utc=True miatt kellene).
                aware_dt = timezone.utc.localize(dt_object) if hasattr(timezone.utc, 'localize') else dt_object.replace(tzinfo=timezone.utc)
                package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Naive datetime {dt_object} localized to UTC: {aware_dt}")
            else:
                # Már "aware" datetime.
                aware_dt = dt_object
                package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Input datetime {dt_object} is already aware.")

            # Konvertálás a cél időzónára (ha szükséges)
            final_dt: datetime
            if aware_dt.tzinfo != target_tz: # Direkt összehasonlítás működik standard tzinfo objektumokkal
                final_dt = aware_dt.astimezone(target_tz)
                package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Converted {aware_dt} to target_tz ({target_tz.tzname(None) if target_tz else 'None'}): {final_dt}")
            else:
                final_dt = aware_dt
                package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: Datetime {final_dt} is already in target_tz ({target_tz.tzname(None) if target_tz else 'None'}).")

            # Végső ellenőrzés a timestamp küszöbbel
            # A timestamp() mindig UTC-alapú timestampet ad vissza, függetlenül az objektum időzónájától
            if final_dt.timestamp() < MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS:
                package_logger.warning(
                    f"{log_prefix}parse_string_to_aware_datetime: Final datetime {final_dt} (timestamp: {final_dt.timestamp()}) "
                    f"is below threshold (min: {MIN_VALID_TIMESTAMP_THRESHOLD_SECONDS}). Original value: '{value}'. Returning None."
                )
                return None
            return final_dt
        else: # Ha dt_object valamiért None maradt a string parse után (elvileg a fenti logika ezt lefedi)
            package_logger.debug(f"{log_prefix}parse_string_to_aware_datetime: dt_object is None after processing. Original value: '{value}'.")
            return None

    except (ValueError, TypeError, OSError, OverflowError, pd.errors.ParserError) as e:
        package_logger.warning(
            f"{log_prefix}parse_string_to_aware_datetime: Error parsing datetime from '{value}' (cleaned: '{cleaned_value}'). Error: {e}",
            exc_info=False # exc_info=True lehetne debuggoláshoz, de False a rövidebb logokért
        )
        return None
    except Exception as e: # Váratlan hibák
        package_logger.error(
            f"{log_prefix}parse_string_to_aware_datetime: Unexpected error parsing datetime from '{value}'. Error: {e}",
            exc_info=True
        )
        return None
    # Elvileg ide nem futhat a kód, mert minden ág return-nel végződik
    return None


def parse_timestamp_to_iso_utc(timestamp: Any, *, default_tz: Optional[tzinfo] = None, context: str = "") -> Optional[str]:
    """
    Megpróbál különböző időbélyeg formátumokat egységes ISO 8601 UTC stringgé konvertálni.
    Használja a `parse_string_to_aware_datetime` függvényt.
    """
    # default_tz itt kevésbé releváns, mivel parse_string_to_aware_datetime kezeli a naiv eseteket is
    log_prefix = f"[{context}] " if context and context.strip() else ""
    
    aware_dt_utc = parse_string_to_aware_datetime(
        timestamp, 
        context=f"{log_prefix}parse_aware_dt_for_iso", 
        target_tz=timezone.utc # Mindig UTC-be kérjük
    )

    if aware_dt_utc is None:
        # A parse_string_to_aware_datetime már logolta a hibát.
        # package_logger.debug(f"{log_prefix}parse_timestamp_to_iso_utc: Failed to get aware datetime for '{timestamp}'.")
        return None

    try:
        # Formátum: YYYY-MM-DDTHH:MM:SS.sssZ (millisecond pontosság, Z jelölés UTC-re)
        # A datetime.isoformat() UTC aware datetime esetén a '+00:00' suffixet használja.
        iso_string = aware_dt_utc.isoformat(timespec='milliseconds')

        # Cseréljük le a '+00:00'-t 'Z'-re a gyakoribb konvenció miatt.
        if iso_string.endswith('+00:00'):
            iso_string_final = iso_string[:-6] + 'Z'
        elif not iso_string.endswith('Z'): # Előfordulhat, ha a tz nem pontosan timezone.utc? Nem valószínű.
            # Ha valamiért nem +00:00 és nem Z, de tudjuk, hogy UTC, akkor is Z-t teszünk.
            # Ez egy biztonsági háló, de aware_dt_utc.tzinfo == timezone.utc miatt nem kellene ide futni.
            package_logger.warning(f"{log_prefix}parse_timestamp_to_iso_utc: ISO string '{iso_string}' from UTC datetime {aware_dt_utc} did not end with '+00:00' or 'Z'. Appending 'Z'.")
            iso_string_final = iso_string + 'Z' 
        else: # Már 'Z'-re végződik
            iso_string_final = iso_string
        
        # package_logger.debug(f"{log_prefix}parse_timestamp_to_iso_utc: Converted '{timestamp}' to ISO UTC string: '{iso_string_final}'.")
        return iso_string_final

    except Exception as format_error:
        package_logger.error(
            f"{log_prefix}parse_timestamp_to_iso_utc: Error formatting UTC datetime {aware_dt_utc} to ISO string. Error: {format_error}. Original input: '{timestamp}'.",
            exc_info=True
        )
        return None


def _validate_date_string(v: Any, context: str = "") -> Optional[str]:
    """Validálja, hogy a string érvényes YYYY-MM-DD dátumformátumú-e."""
    log_prefix = f"[{context}] " if context and context.strip() else ""
    cleaned_v = _clean_value(v, context=f"{log_prefix}_clean_value_for_date_str")
    if cleaned_v is None: 
        # Pydantic validátorban ez hibát fog okozni, ami jó. Itt nem kell explicit raise.
        return None 

    if not isinstance(cleaned_v, str):
        # Ha Pydantic validátor hívja, ez ValidationError-t okoz.
        raise ValueError(f"{log_prefix}_validate_date_string: Invalid type for date string: Expected string, got {type(cleaned_v).__name__}. Value: '{v}'")
    try:
        datetime.strptime(cleaned_v, '%Y-%m-%d')
        return cleaned_v
    except ValueError:
        # Ha Pydantic validátor hívja, ez ValidationError-t okoz.
        raise ValueError(f"{log_prefix}_validate_date_string: Invalid date format: '{cleaned_v}'. Expected YYYY-MM-DD.")


# --- URL Kezelés ---
# JAVÍTÁS: normalize_url függvény frissítése a loggerrel és a HttpUrl bemenet kezelésével
def normalize_url(url_input: Union[Optional[str], HttpUrl], *, context: str = "") -> Optional[HttpUrl]:
    """
    Normalizál egy URL stringet vagy HttpUrl objektumot és validálja Pydantic HttpUrl típussal.
    Ha string a bemenet, hozzáadja a https:// sémát, ha hiányzik, és javítja a dupla perjelt.
    Megpróbálja javítani az URL-kódolási hibákat, ha a Pydantic erre panaszkodik.
    Ha HttpUrl a bemenet, azt adja vissza változatlanul.

    Args:
        url_input: A normalizálandó URL string vagy már validált HttpUrl objektum.
        context: Opcionális string a hívó kontextusának azonosítására a logokban.

    Returns:
        Pydantic `HttpUrl` objektum, vagy `None` hiba esetén.
    """
    log_prefix = f"[{context}][normalize_url] " if context and context.strip() else "[normalize_url] "
    package_logger.debug(f"{log_prefix}Input for normalization: '{str(url_input)}' (Type: {type(url_input)})")

    if isinstance(url_input, HttpUrl):
        package_logger.debug(f"{log_prefix}Input is already a Pydantic HttpUrl. Returning as is: '{str(url_input)}'")
        return url_input

    # Ha nem HttpUrl, akkor stringként vagy None-ként kellene kezelnünk.
    # Ellenőrizzük, hogy az url_input string vagy None-e. Ha más, az hiba.
    if not isinstance(url_input, (str, type(None))):
        package_logger.warning(f"{log_prefix}Invalid input type. Expected str, HttpUrl, or None, but got {type(url_input).__name__}. Value: '{url_input}'. Returning None.")
        return None

    # Itt url_input már biztosan str vagy None
    url_string: Optional[str] = url_input 

    cleaned_url_str = _clean_value(url_string, context=f"{context}:_clean_url_for_normalize")
    
    if not cleaned_url_str: # Ez None-t jelent, mivel _clean_value stringekre None-t vagy strip-elt stringet ad
        package_logger.debug(f"{log_prefix}URL string is None or became None after cleaning. Original input: '{str(url_input)}'. Returning None.")
        return None
    
    # Itt cleaned_url_str egy nem üres string
    final_url_str = cleaned_url_str 
    package_logger.debug(f"{log_prefix}Cleaned URL string (after _clean_value): '{final_url_str}'")

    original_before_schema_fix = final_url_str
    if final_url_str.startswith('//'):
        final_url_str = 'https:' + final_url_str
        package_logger.debug(f"{log_prefix}URL started with '//', prepended 'https:'. Original: '{original_before_schema_fix}', Result: '{final_url_str}'")
    elif not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", final_url_str):
        # Csak akkor adjunk hozzá https-t, ha nincs semmilyen séma
        final_url_str = 'https://' + final_url_str
        package_logger.debug(f"{log_prefix}URL schema missing, prepended 'https://'. Original: '{original_before_schema_fix}', Result: '{final_url_str}'")
    
    original_before_slash_fix = final_url_str
    if "://" in final_url_str:
        scheme_part, rest_of_url = final_url_str.split("://", 1)
        # Csak a séma utáni részt tisztítjuk a felesleges kezdő perjelektől
        cleaned_rest = rest_of_url.lstrip('/') 
        if rest_of_url != cleaned_rest: # Csak ha volt változás
            final_url_str = f"{scheme_part}://{cleaned_rest}"
            package_logger.debug(f"{log_prefix}Corrected leading slashes after schema. Original: '{original_before_slash_fix}', Corrected: '{final_url_str}'")

    package_logger.debug(f"{log_prefix}Final URL string for Pydantic validation: '{final_url_str}'")

    # === ELSŐDLEGES VALIDÁCIÓS KÍSÉRLET ===
    try:
        validated_url = HttpUrl(final_url_str)
        package_logger.debug(f"{log_prefix}URL '{url_string}' (processed as '{final_url_str}') Pydantic validated successfully to: '{str(validated_url)}'")
        return validated_url
    except ValidationError as validation_error: # <<< ELSŐ HIBA ELKAPÁSA
        error_details = validation_error.errors(include_input=False) 
        package_logger.warning(
            f"{log_prefix}Initial Pydantic HttpUrl validation FAILED for processed URL '{final_url_str}' (Original raw: '{url_string}'). "
            f"Error count: {len(error_details)}. Validation Errors: {json.dumps(error_details, indent=2)}",
            exc_info=False
        )

        # === URL-KÓDOLÁSI JAVÍTÁSI KÍSÉRLET (CSAK HA AZ ELSŐ HIBA 'url_encoding' VOLT) ===
        needs_encoding_fix = any(err.get('type') == 'url_encoding' for err in error_details)

        if needs_encoding_fix:
            package_logger.info(f"{log_prefix}Attempting to fix URL encoding for '{final_url_str}' based on Pydantic 'url_encoding' error...")
            try:
                scheme, netloc, path, query_string, fragment = urlsplit(final_url_str)
                
                encoded_path = quote(path, safe='/:@&=+$,')
                package_logger.debug(f"{log_prefix}Original path: '{path}', Encoded path: '{encoded_path}'")

                parsed_query = parse_qs(query_string, keep_blank_values=True, strict_parsing=False, encoding='utf-8', errors='replace')
                encoded_query_params = {}
                for key, values in parsed_query.items():
                    encoded_key = quote(key, safe='') 
                    encoded_query_params[encoded_key] = [quote(str(v), safe='') for v in values]
                
                encoded_query_string = urlencode(encoded_query_params, doseq=True)
                package_logger.debug(f"{log_prefix}Original query: '{query_string}', Encoded query: '{encoded_query_string}'")

                reconstructed_url_str = urlunsplit((scheme, netloc, encoded_path, encoded_query_string, fragment))
                package_logger.debug(f"{log_prefix}Reconstructed URL after attempting encoding fix: '{reconstructed_url_str}'")
                
                # Próbáljuk újra validálni a JAVÍTOTT URL-t
                try:
                    validated_url_after_fix = HttpUrl(reconstructed_url_str)
                    package_logger.info(f"{log_prefix}URL '{url_string}' (original raw) successfully Pydantic validated AFTER encoding fix: '{str(validated_url_after_fix)}' (Fixed from: '{final_url_str}')")
                    return validated_url_after_fix
                except ValidationError as e_fix: # Ha a javítás UTÁNI validáció is hibát dob
                    new_error_details = e_fix.errors(include_input=False)
                    package_logger.warning(f"{log_prefix}Pydantic validation STILL FAILED for re-encoded URL '{reconstructed_url_str}'. Original error details were: {json.dumps(error_details, indent=2)}. New error details: {json.dumps(new_error_details, indent=2)}")
                    return None # Ha a javítás után sem jó, akkor feladjuk
            
            except Exception as e_encode_reconstruct: # Hiba maga az URL-kódolási javítási kísérlet során
                package_logger.error(f"{log_prefix}Error during URL encoding/reconstruction attempt for '{final_url_str}': {e_encode_reconstruct}", exc_info=True)
                return None 
        
        else: # Ha az ELSŐ ValidationError nem 'url_encoding' típusú volt
            package_logger.debug(f"{log_prefix}Initial validation error was not 'url_encoding' type. Not attempting encoding fix. Returning None.")
            return None 
    
    except Exception as other_error: # Egyéb, nem várt hibák az ELSŐ validációs kísérletnél (nem ValidationError)
        package_logger.error(
            f"{log_prefix}Unexpected error during initial Pydantic HttpUrl validation for URL '{final_url_str}' (Original raw: '{url_string}'): {other_error}",
            exc_info=True
        )
        return None
def safe_get(df: Optional[pd.DataFrame], index: Any, column: str, default: Any = None, *, context: str = "") -> Any:
    """
    Biztonságosan lekér egy értéket egy Pandas DataFrame-ből.
    """
    log_prefix = f"[{context}] " if context and context.strip() else ""
    if df is None:
        # package_logger.debug(f"{log_prefix}safe_get: DataFrame is None. Returning default.") # Lehet túl verbose
        return default
    if index not in df.index:
        package_logger.debug(f"{log_prefix}safe_get: Index '{index}' not found in DataFrame. Returning default.")
        return default
    if column not in df.columns:
        package_logger.debug(f"{log_prefix}safe_get: Column '{column}' not found in DataFrame. Returning default.")
        return default

    try:
        value = df.loc[index, column]
        if pd.isna(value):
            # package_logger.debug(f"{log_prefix}safe_get: Value at df.loc['{index}', '{column}'] is pd.isna(). Returning default.")
            return default
        return value
    except (KeyError, IndexError, AttributeError) as e:
        package_logger.warning(f"{log_prefix}safe_get: Error accessing df.loc['{index}', '{column}']. Error: {e}. Returning default.", exc_info=False)
        return default
    except Exception as e: # Más váratlan hiba
        package_logger.error(f"{log_prefix}safe_get: Unexpected exception for df.loc['{index}', '{column}']. Error: {e}. Returning default.", exc_info=True)
        return default


def _ensure_datetime_index(df: pd.DataFrame, function_name: str = "caller") -> Optional[pd.DataFrame]:
    """
    Biztosítja, hogy a DataFrame indexe UTC időzónájú Pandas DatetimeIndex legyen.
    Másolaton dolgozik.
    """
    log_prefix = f"[{function_name}][_ensure_datetime_index] "

    if not isinstance(df, pd.DataFrame):
        package_logger.error(f"{log_prefix}Invalid input: Expected pandas DataFrame, got {type(df).__name__}.")
        return None
    if df.empty:
        package_logger.debug(f"{log_prefix}Input DataFrame is empty. Returning an empty DataFrame copy.")
        return df.copy() # Visszaadunk egy üres DF-et, aminek az indexe is üres (de típusa megmarad)

    df_copy = df.copy()

    try:
        if isinstance(df_copy.index, pd.DatetimeIndex):
            package_logger.debug(f"{log_prefix}Index is already DatetimeIndex. Checking timezone...")
            current_tz = df_copy.index.tz
            if current_tz is None: # Naiv index
                package_logger.info(f"{log_prefix}Index is naive DatetimeIndex. Localizing to UTC.")
                try:
                    df_copy.index = df_copy.index.tz_localize('UTC', ambiguous='infer', nonexistent='shift_forward')
                except Exception as loc_err:
                     package_logger.error(f"{log_prefix}Failed to localize naive DatetimeIndex to UTC: {loc_err}. Returning None.", exc_info=True)
                     return None
            # pandas.DatetimeIndex.tz.zone egy stringet ad vissza, pl. 'UTC'
            elif str(current_tz) != 'UTC': # Időzónával, de nem UTC
                package_logger.info(f"{log_prefix}Index has timezone '{current_tz}'. Converting to UTC.")
                try:
                    df_copy.index = df_copy.index.tz_convert('UTC')
                except Exception as conv_err:
                     package_logger.error(f"{log_prefix}Failed to convert DatetimeIndex tz from '{current_tz}' to UTC: {conv_err}. Returning None.", exc_info=True)
                     return None
            # else: Már UTC, nincs teendő az időzónával
            
            if not df_copy.index.is_monotonic_increasing:
                package_logger.debug(f"{log_prefix}Sorting DatetimeIndex as it's not monotonically increasing.")
                df_copy = df_copy.sort_index()
            return df_copy

        possible_time_cols = ['time', 'date', 'datetime', 'timestamp'] 
        time_col_name: Optional[str] = None
        for col_candidate_lower in possible_time_cols:
            for col_original_case in df_copy.columns:
                if col_original_case.lower() == col_candidate_lower:
                    time_col_name = col_original_case
                    package_logger.debug(f"{log_prefix}Found potential time column: '{time_col_name}'.")
                    break
            if time_col_name:
                break
        
        if time_col_name:
            package_logger.info(f"{log_prefix}Using column '{time_col_name}' for DatetimeIndex conversion to UTC.")
            # pd.to_datetime utc=True gondoskodik az UTC konverzióról
            converted_column = pd.to_datetime(df_copy[time_col_name], errors='coerce', utc=True, infer_datetime_format=True)
            
            valid_indices = converted_column.notna()
            if not valid_indices.all():
                rows_dropped = (~valid_indices).sum() # sum() True értékeket számol
                package_logger.warning(f"{log_prefix}Dropped {rows_dropped} rows due to NaT values in time column '{time_col_name}' during conversion.")
                df_copy = df_copy[valid_indices]
                converted_column = converted_column[valid_indices] # Csak a validakat tartsuk meg

            if df_copy.empty: # Ha minden sor kiesett
                 package_logger.warning(f"{log_prefix}DataFrame became empty after dropping NaT rows from column '{time_col_name}'.")
                 # Visszaadhatnánk egy üres DF-et helyes index típussal, ha a converted_column nem üres
                 # De ha df_copy üres, akkor az indexelés is üres lesz.
                 return df_copy 

            df_copy = df_copy.set_index(converted_column)
            df_copy.index.name = 'time' # Egységes index név

            if not df_copy.index.is_monotonic_increasing:
                df_copy = df_copy.sort_index()
            
            if isinstance(df_copy.index, pd.DatetimeIndex): # Dupla ellenőrzés
                package_logger.info(f"{log_prefix}Successfully created UTC DatetimeIndex from column '{time_col_name}'.")
                return df_copy
            else: # Ez nem fordulhatna elő, ha pd.to_datetime sikeres volt
                package_logger.error(f"{log_prefix}Failed to create DatetimeIndex from column '{time_col_name}'. Resulting index type: {type(df_copy.index)}. Returning None.")
                return None

        package_logger.info(f"{log_prefix}No standard time column found. Attempting to convert existing index to DatetimeIndex (UTC)...")
        try:
            original_index_name = df_copy.index.name
            # Itt is utc=True, errors='coerce'
            converted_index = pd.to_datetime(df_copy.index, errors='coerce', utc=True, infer_datetime_format=True)

            valid_indices = pd.notna(converted_index)
            if not valid_indices.all():
                rows_dropped = (~valid_indices).sum()
                package_logger.warning(f"{log_prefix}Dropped {rows_dropped} rows due to NaT values during existing index conversion.")
                df_copy = df_copy[valid_indices]
                converted_index = converted_index[valid_indices]

            if df_copy.empty:
                package_logger.warning(f"{log_prefix}DataFrame became empty after dropping NaT index rows during conversion.")
                return df_copy

            df_copy.index = converted_index
            df_copy.index.name = original_index_name if original_index_name else 'time'
            
            if not df_copy.index.is_monotonic_increasing:
                df_copy = df_copy.sort_index()

            if isinstance(df_copy.index, pd.DatetimeIndex):
                package_logger.info(f"{log_prefix}Successfully converted existing index to UTC DatetimeIndex.")
                return df_copy
            else:
                package_logger.error(f"{log_prefix}Failed to convert existing index to DatetimeIndex. Resulting index type: {type(df_copy.index)}. Returning None.")
                return None

        except Exception as idx_conv_err:
            package_logger.error(f"{log_prefix}Exception converting existing index: {idx_conv_err}. Returning None.", exc_info=True)
            return None

    except Exception as general_error:
        package_logger.error(f"{log_prefix}Unexpected error in _ensure_datetime_index: {general_error}. Returning None.", exc_info=True)
        return None

def generate_cache_key(
    data_type: str,
    source: str,
    symbol: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    prefix: str = "finbot_cache"
) -> str:
    """
    Generál egy konzisztens cache kulcsot a megadott paraméterek alapján.
    """
    key_parts = [prefix, data_type.lower(), source.lower(), symbol.upper()] # Egységes kis/nagybetű

    if params:
        try:
            # A dict kulcsait is érdemes lehet rendezni a determinizmushoz, ha a dict sorrendje nem garantált
            # json.dumps(params, sort_keys=True) ezt megoldja
            params_str = json.dumps(params, sort_keys=True, separators=(',', ':')) # separators a kompakt formáért
            params_hash = hashlib.md5(params_str.encode('utf-8')).hexdigest()[:12] # Kicsit hosszabb hash a jobb egyediségért
            key_parts.append(f"params_{params_hash}")
        except TypeError as e:
            # Itt package_logger használata helyett ValueError dobása jobb, mert ez programozási hiba
            raise ValueError(f"Failed to serialize cache key parameters to JSON: {params}. Error: {e}") from e

    cache_key = ":".join(filter(None, key_parts))
    # Reguláris kifejezés a nem kívánt karakterek cseréjére (opcionális, de jó gyakorlat)
    # cache_key = re.sub(r'[^\w.:-]', '_', cache_key) # Engedélyezzük a betűket, számokat, _, ., :, -
    # package_logger.debug(f"Generated cache key: '{cache_key}' for {data_type}, {source}, {symbol}, {params}")
    return cache_key

# --- Modul Betöltésének Visszajelzése ---
package_logger.info(f"--- {__name__} (Aevorex FinBot Helpers - v1.2 - Consistent Logging and Robust URL Normalization) module loaded successfully. ---")