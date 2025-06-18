# backend/core/ai/helpers.py

from typing import Any, Final, Optional

# --- Absolute Imports ---
try:
    from modules.financehub.backend.utils.logger_config import get_logger
except ImportError as e:
    import logging
    logging.basicConfig(level=logging.ERROR)
    logging.error(f"FATAL ERROR: Could not import logger in ai/helpers.py: {e}. Check structure.", exc_info=True)
    raise RuntimeError(f"AI Helpers failed to initialize due to missing logger dependency: {e}") from e

logger = get_logger(__name__)

# --- Constants ---
DEFAULT_NA_INTERNAL: Final[str] = "N/A" # Belső használatra, ha nincs más megadva
DEFAULT_NA: Final[str] = "N/A"
# --- Formatting Function (v1.1 - with default_if_error and refined error handling) ---

def safe_format_value(
    symbol: str, 
    field_name: str, 
    value: Any, 
    formatter: str = "", 
    default_if_error: Optional[str] = DEFAULT_NA_INTERNAL # ÚJ PARAMÉTER
) -> str:
    """
    Safely formats fundamental data values for display or inclusion in prompts.
    Handles None, common 'N/A' strings, and applies basic formatting.

    Args:
        symbol: Stock symbol (for logging).
        field_name: The name of the field being formatted (for logging).
        value: The raw value to format.
        formatter: A string indicating the desired format:
            "" (default): Convert to string.
            ",": Format as integer with thousands separators.
            ".2f": Format as float with 2 decimal places.
            ".2%": Format as percentage with 2 decimal places (assumes input is already %).
        default_if_error: The string to return if formatting fails or value is None/NA.
                          Defaults to "N/A".

    Returns:
        The formatted string representation of the value, or default_if_error.
    """
    func_name = "safe_format_value_v1.1"
    
    # Kezdeti ellenőrzés a None és gyakori "N/A" értékekre
    if value is None or (isinstance(value, str) and value.strip().lower() in ['none', 'na', '-', '', 'n/a']):
        return default_if_error # Használjuk a paramétert

    try:
        val_str = str(value).strip()
        if not val_str: # Üres string a strip után is default_if_error-t ad vissza
            return default_if_error

        if formatter == ",":
            # Robusztus konverzió: eltávolítjuk a vesszőket, float-tá alakítjuk, majd int-té
            # Ez kezeli pl. a "1,234.56" stringet is, amiből 1,234 lesz.
            cleaned_val_str = val_str.replace(',', '')
            numeric_val = float(cleaned_val_str) 
            return f"{int(numeric_val):,}"
        elif formatter == ".2f":
            return f"{float(val_str):.2f}"
        elif formatter == ".2%":
            if val_str.endswith('%'):
                val_str = val_str[:-1]
            # Biztosítjuk, hogy a string float-tá alakítható legyen
            return f"{float(val_str):.2f}%"
        else: # Alapértelmezett: stringként visszaadni
            return val_str

    except (ValueError, TypeError) as e:
        logger.warning(f"[{symbol}] {func_name}: Could not format field '{field_name}' (value: '{value}', type: {type(value)}) with formatter '{formatter}'. Error: {e}")
        # JAVÍTOTT: Hiba esetén a default_if_error-t adjuk vissza
        return default_if_error
    except Exception as e_unhandled: # Minden más váratlan hiba
         logger.error(f"[{symbol}] {func_name}: UNEXPECTED error formatting field '{field_name}'. Value: '{value}'. Formatter: '{formatter}'. Error: {e_unhandled}", exc_info=True)
         # JAVÍTOTT: Hiba esetén a default_if_error-t adjuk vissza
         return default_if_error