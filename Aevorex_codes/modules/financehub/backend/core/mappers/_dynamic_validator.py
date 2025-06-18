# === Dinamikus Import és Validálás Segédfüggvény ===
# ==============================================================================
import importlib
import time
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, ValidationError

# Import the required constants and logger from the mapper base
from ._mapper_base import MODELS_STOCK_MODULE_PATH, logger

def _dynamic_import_and_validate(model_name: str, data: Dict[str, Any], log_prefix: str) -> Optional[BaseModel]:
    """
    Dynamically imports a model from the specified module path and validates
    the provided data against it. Handles ImportError, AttributeError,
    ValidationError, and other exceptions.

    Args:
        model_name (str): The name of the Pydantic model class to import.
        data (Dict[str, Any]): The dictionary containing data to validate.
        log_prefix (str): The prefix for log messages (e.g., "[AAPL][mapper]").

    Returns:
        Optional[BaseModel]: The validated Pydantic model instance, or None on error.
    """
    validation_start = time.monotonic()
    ModelClass = None

    try:
        # 1. Dynamic Module Import
        # Attempt to import the module defined by MODELS_STOCK_MODULE_PATH
        models_stock_module = importlib.import_module(MODELS_STOCK_MODULE_PATH)
        
        # 2. Get the Model Class
        # Attempt to get the specified model class from the imported module
        ModelClass = getattr(models_stock_module, model_name)
        
        # 3. Validate Data
        # Create an instance of the model class using the provided data
        validated_instance = ModelClass(**data)
        
        validation_duration = time.monotonic() - validation_start
        logger.debug(f"{log_prefix} Successfully validated {model_name} in {validation_duration:.4f}s.")
        return validated_instance

    except ImportError as e_import:
        # Critical error: Module import failed
        logger.critical(f"{log_prefix} CRITICAL DYNAMIC IMPORT FAILED: Could not import module '{MODELS_STOCK_MODULE_PATH}'. Check path and file integrity. Error: {e_import}")
        return None

    except AttributeError as e_attr:
        # Critical error: Model class not found in module
        logger.critical(f"{log_prefix} CRITICAL DYNAMIC ATTRIBUTE ERROR: Model '{model_name}' not found in module '{MODELS_STOCK_MODULE_PATH}'. Available attributes: {dir(models_stock_module) if 'models_stock_module' in locals() else 'N/A'}. Error: {e_attr}")
        return None

    except ValidationError as e_validation:
        # Validation error: Data does not conform to model schema
        validation_duration = time.monotonic() - validation_start
        error_count = len(e_validation.errors()) if hasattr(e_validation, 'errors') else 1
        logger.warning(f"{log_prefix} Validation failed for {model_name} after {validation_duration:.4f}s. {error_count} errors. Summary: {str(e_validation)[:200]}...")
        return None

    except Exception as e_unexpected:
        # Unexpected error during validation process
        validation_duration = time.monotonic() - validation_start
        logger.error(f"{log_prefix} Unexpected error during {model_name} validation after {validation_duration:.4f}s: {e_unexpected}", exc_info=True)
        return None