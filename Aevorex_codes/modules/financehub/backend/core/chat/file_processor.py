# backend/core/chat/file_processor.py

import logging
import magic # python-magic for MIME types
import PyPDF2 # Example library for PDF
import docx # python-docx
from io import BytesIO
from typing import List, Optional, Dict, Any, Tuple, Literal
from pathlib import Path

from pydantic import BaseModel, Field, validator

# Import central settings
from ...config import settings

# --- Constants ---
# Read from settings or define defaults
MAX_FILE_SIZE = settings.FILE_PROCESSING.MAX_SIZE_BYTES # Define in config.py
ALLOWED_MIME_TYPES = set(settings.FILE_PROCESSING.ALLOWED_MIME_TYPES) # Define in config.py
ALLOWED_EXTENSIONS = set(settings.FILE_PROCESSING.ALLOWED_EXTENSIONS) # Define in config.py
CHUNK_SIZE = settings.FILE_PROCESSING.CHUNK_SIZE # Define in config.py
CHUNK_OVERLAP = settings.FILE_PROCESSING.CHUNK_OVERLAP # Define in config.py
# Add other settings as needed

# --- Custom Exceptions ---
class FileProcessingError(Exception): pass
class FileValidationError(FileProcessingError): pass
class FileSizeExceededError(FileValidationError): pass
class FileTypeNotAllowedError(FileValidationError): pass
class ContentExtractionError(FileProcessingError): pass
class ChunkingError(FileProcessingError): pass

# --- Pydantic Models for Input/Output ---

class UploadedFileInfo(BaseModel):
    """Information about the file to be processed."""
    filename: str
    content_type: str # Provided by FastAPI/request
    size: int # In bytes
    file_content: bytes # The actual file content as bytes

class ChunkMetadata(BaseModel):
    """Metadata associated with a single processed text chunk."""
    source_filename: str
    chunk_index: int
    page_number: Optional[int] = None # Primarily for PDFs
    char_count: int
    # Add more context if needed, e.g., section header

class ProcessedChunk(BaseModel):
    """Represents a single chunk of processed text with its metadata."""
    text: str
    metadata: ChunkMetadata

class ProcessedFileData(BaseModel):
    """Structured result of file processing."""
    status: Literal['success', 'error']
    original_filename: str
    detected_mime_type: Optional[str] = None
    file_size_bytes: int
    error_message: Optional[str] = None
    # --- Extracted Content ---
    extracted_text: Optional[str] = None # Full text if needed, might be large
    chunks: List[ProcessedChunk] = Field(default_factory=list)
    # --- Image Specific ---
    image_base64: Optional[str] = None
    image_format: Optional[str] = None # e.g., 'PNG', 'JPEG'
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    image_description: Optional[str] = None # If VLM processing is integrated later


# --- Core Processing Logic ---

logger = logging.getLogger(__name__)

async def process_uploaded_file(file_info: UploadedFileInfo) -> ProcessedFileData:
    """
    Main orchestrator function to process an uploaded file.

    1. Validates the file (size, type).
    2. Detects the actual MIME type.
    3. Selects and runs the appropriate content extractor.
    4. Chunks the extracted text (if applicable).
    5. Returns structured data or error information.
    """
    result = ProcessedFileData(
        status='error', # Default to error
        original_filename=file_info.filename,
        file_size_bytes=file_info.size
    )
    try:
        # 1. Basic Validation
        logger.info(f"Processing file: '{file_info.filename}', Size: {file_info.size} bytes, Content-Type: {file_info.content_type}")
        _validate_file_size(file_info.size)
        # We'll validate type after MIME detection

        # 2. MIME Type Detection (more reliable than content_type header)
        detected_mime = _detect_mime_type(file_info.file_content)
        result.detected_mime_type = detected_mime
        logger.info(f"Detected MIME type: {detected_mime}")
        _validate_file_type(file_info.filename, detected_mime) # Validate detected type

        # 3. Content Extraction (Dispatch based on MIME type)
        if detected_mime.startswith('text/'):
            extracted_text = await _extract_text_plain(file_info.file_content)
        elif detected_mime == 'application/pdf':
            extracted_text = await _extract_text_from_pdf(file_info.file_content, file_info.filename)
        elif detected_mime in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']: # DOCX
             extracted_text = await _extract_text_from_docx(file_info.file_content, file_info.filename)
        elif detected_mime.startswith('image/'):
             # Handle image processing separately - might not produce text chunks
             # It could populate image_* fields in the result
             await _process_image(file_info.file_content, result) # Modifies result directly
             extracted_text = None # No text from image directly (unless OCR/VLM added here)
        else:
            # Unsupported type handled by _validate_file_type, but defensive check
            raise FileTypeNotAllowedError(f"Extraction logic not implemented for MIME type: {detected_mime}")

        result.extracted_text = extracted_text # Store full text if extracted

        # 4. Chunking (if text was extracted)
        if extracted_text:
            logger.info(f"Extracted text length: {len(extracted_text)} chars. Starting chunking...")
            chunks_data = _chunk_text_recursively( # Or another strategy
                text=extracted_text,
                filename=file_info.filename,
                chunk_size=CHUNK_SIZE,
                chunk_overlap=CHUNK_OVERLAP
                # Pass page info here if extracted from PDF
            )
            result.chunks = chunks_data
            logger.info(f"Chunking complete. Generated {len(chunks_data)} chunks.")
        else:
            logger.info("No text extracted for chunking.")

        result.status = 'success'
        logger.info(f"File '{file_info.filename}' processed successfully.")

    except FileValidationError as e:
        logger.error(f"File validation failed for '{file_info.filename}': {e}")
        result.error_message = f"Validation Error: {e}"
        result.status = 'error' # Ensure status is error
    except ContentExtractionError as e:
        logger.error(f"Content extraction failed for '{file_info.filename}': {e}", exc_info=True)
        result.error_message = f"Processing Error: {e}"
        result.status = 'error'
    except ChunkingError as e:
         logger.error(f"Text chunking failed for '{file_info.filename}': {e}", exc_info=True)
         result.error_message = f"Chunking Error: {e}"
         result.status = 'error'
    except Exception as e:
        logger.exception(f"Unexpected error processing file '{file_info.filename}': {e}") # Includes traceback
        result.error_message = f"Unexpected internal error during processing: {e}"
        result.status = 'error'

    return result


# --- Helper Functions ---

def _validate_file_size(size_bytes: int):
    """Checks if file size exceeds the configured limit."""
    if size_bytes > MAX_FILE_SIZE:
        raise FileSizeExceededError(f"File size {size_bytes} bytes exceeds maximum allowed limit of {MAX_FILE_SIZE} bytes.")
    if size_bytes <= 0:
        raise FileValidationError("File cannot be empty (0 bytes).")
    logger.debug(f"File size {size_bytes} bytes is within limit.")

def _detect_mime_type(content: bytes) -> str:
    """Detects the MIME type from file content using python-magic."""
    try:
        mime_type = magic.from_buffer(content, mime=True)
        return mime_type
    except Exception as e:
        logger.error(f"Failed to detect MIME type: {e}")
        return "application/octet-stream" # Default or raise error

def _validate_file_type(filename: str, detected_mime: str):
    """Checks if the detected MIME type and extension are allowed."""
    extension = Path(filename).suffix.lower().strip('.')
    mime_allowed = detected_mime in ALLOWED_MIME_TYPES
    # Allow extension check as a fallback/complement, normalize extension
    ext_allowed = extension in ALLOWED_EXTENSIONS if extension else False

    # Require MIME type to be allowed
    if not mime_allowed:
         raise FileTypeNotAllowedError(f"File type with MIME '{detected_mime}' is not allowed.")
    # Optional: Log warning if extension is not in the allowed list but MIME is ok
    # elif not ext_allowed:
    #     logger.warning(f"File MIME type '{detected_mime}' is allowed, but extension '.{extension}' is not in the configured allowed list for '{filename}'. Proceeding based on MIME type.")

    logger.debug(f"File type validation passed for MIME: {detected_mime}, Extension: {extension}")


async def _extract_text_plain(content: bytes) -> str:
    """Extracts text from plain text files, handling encoding."""
    try:
        # Try decoding with UTF-8 first, common default
        return content.decode('utf-8')
    except UnicodeDecodeError:
        logger.warning("UTF-8 decoding failed, trying latin-1 for plain text.")
        try:
            return content.decode('latin-1') # Common fallback
        except Exception as e:
             logger.error(f"Failed to decode plain text content: {e}")
             raise ContentExtractionError("Could not decode plain text file content.")

async def _extract_text_from_pdf(content: bytes, filename: str) -> str:
    """Extracts text from a PDF file using PyPDF2 (example)."""
    # Consider PyMuPDF/fitz for better results if possible (requires separate install)
    logger.debug(f"Extracting text from PDF: {filename}")
    text = ""
    try:
        reader = PyPDF2.PdfReader(BytesIO(content))
        num_pages = len(reader.pages)
        logger.debug(f"PDF has {num_pages} pages.")
        for page_num in range(num_pages):
            page = reader.pages[page_num]
            page_text = page.extract_text()
            if page_text:
                # Add page number marker (useful for RAG metadata)
                text += f"[Page {page_num + 1}]\n{page_text.strip()}\n\n"
            else:
                logger.warning(f"No text extracted from page {page_num + 1} of {filename}")
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF '{filename}': {e}", exc_info=True)
        raise ContentExtractionError(f"Failed to extract text from PDF: {e}")

async def _extract_text_from_docx(content: bytes, filename: str) -> str:
    """Extracts text from a DOCX file using python-docx."""
    logger.debug(f"Extracting text from DOCX: {filename}")
    try:
        document = docx.Document(BytesIO(content))
        full_text = [para.text for para in document.paragraphs if para.text]
        return "\n".join(full_text).strip()
    except Exception as e:
        logger.error(f"Error extracting text from DOCX '{filename}': {e}", exc_info=True)
        raise ContentExtractionError(f"Failed to extract text from DOCX: {e}")


async def _process_image(content: bytes, result_obj: ProcessedFileData):
    """Processes image files: gets metadata and prepares for potential VLM."""
    # Placeholder: Uses Pillow (requires `pip install Pillow`)
    try:
        from PIL import Image
        import base64
        img = Image.open(BytesIO(content))
        result_obj.image_format = img.format
        result_obj.image_width, result_obj.image_height = img.size
        # Optional: Get Base64 representation
        buffered = BytesIO()
        img.save(buffered, format=img.format or "PNG") # Save in original or PNG format
        result_obj.image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        logger.info(f"Image processed: Format={img.format}, Size={img.size}")
        # TODO: Integrate VLM call here or later based on result_obj.image_base64
        # result_obj.image_description = await call_vlm_service(result_obj.image_base64)
    except ImportError:
        logger.warning("Pillow library not installed. Cannot process image metadata/base64.")
        result_obj.error_message = (result_obj.error_message or "") + " Image processing skipped (Pillow not installed)."
    except Exception as e:
        logger.error(f"Error processing image '{result_obj.original_filename}': {e}", exc_info=True)
        result_obj.error_message = (result_obj.error_message or "") + f" Image processing failed: {e}"


def _chunk_text_recursively(text: str, filename: str, chunk_size: int, chunk_overlap: int) -> List[ProcessedChunk]:
    """Chunks text recursively using LangChain's logic (or similar)."""
    # Requires: pip install langchain
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        # TODO: Consider token-based splitting for more accurate size control with LLMs
        # from langchain.text_splitter import TokenTextSplitter (needs tiktoken)
    except ImportError:
        logger.error("Langchain not installed. Cannot perform text chunking. Returning full text as one chunk.")
        # Fallback: return the whole text as a single chunk
        metadata = ChunkMetadata(
            source_filename=filename,
            chunk_index=0,
            char_count=len(text)
        )
        return [ProcessedChunk(text=text, metadata=metadata)] if text else []

    logger.debug(f"Chunking text with RecursiveCharacterTextSplitter (size={chunk_size}, overlap={chunk_overlap}).")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        # separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""] # Customize separators if needed
    )

    try:
        # LangChain's split_text returns a list of strings
        text_chunks = text_splitter.split_text(text)
        processed_chunks = []
        # TODO: Enhance metadata - try to map chunks back to PDF page numbers if possible
        for i, chunk_str in enumerate(text_chunks):
             metadata = ChunkMetadata(
                 source_filename=filename,
                 chunk_index=i,
                 char_count=len(chunk_str),
                 # page_number = find_page_for_chunk(...) # Needs logic based on PDF extraction markers
             )
             processed_chunks.append(ProcessedChunk(text=chunk_str, metadata=metadata))
        return processed_chunks
    except Exception as e:
        logger.error(f"Error during text chunking: {e}", exc_info=True)
        raise ChunkingError(f"Failed to chunk text: {e}")