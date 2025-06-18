"""
Anahi Module Configuration
Settings for photo gallery and management system
"""

import os
from pathlib import Path

# Base paths
MODULE_PATH = Path(__file__).parent.parent
PHOTOS_PATH = MODULE_PATH / "photos" / "gallery"
FRONTEND_PATH = MODULE_PATH / "frontend"

# Gallery settings
GALLERY_CONFIG = {
    "max_file_size": 10 * 1024 * 1024,  # 10MB
    "allowed_extensions": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
    "thumbnail_size": (300, 300),
    "preview_size": (800, 600),
    "photos_per_page": 20,
    "default_sort": "newest",
    "enable_upload": True,
    "enable_delete": True,
    "require_auth": False,  # Set to True in production
}

# API settings
API_CONFIG = {
    "base_path": "/api/anahi",
    "version": "v1",
    "title": "Anahi Gallery API",
    "description": "Personal photo gallery management API",
}

# Frontend settings
FRONTEND_CONFIG = {
    "title": "Anahi - Személyes Galéria",
    "description": "Personal photo gallery and management system",
    "theme": "dark",
    "language": "hu",
    "enable_animations": True,
    "grid_columns": "auto-fill",
    "min_card_width": "280px",
}

# Security settings (for production)
SECURITY_CONFIG = {
    "enable_csrf": True,
    "session_timeout": 3600,  # 1 hour
    "max_login_attempts": 5,
    "password_min_length": 8,
}

# File processing settings
PROCESSING_CONFIG = {
    "generate_thumbnails": True,
    "optimize_images": True,
    "strip_exif": False,  # Keep EXIF data for photo information
    "backup_originals": True,
    "auto_rotate": True,
}

def get_gallery_path():
    """Get the gallery path, creating it if it doesn't exist"""
    PHOTOS_PATH.mkdir(parents=True, exist_ok=True)
    return str(PHOTOS_PATH)

def get_frontend_path():
    """Get the frontend path"""
    return str(FRONTEND_PATH)

def is_allowed_file(filename):
    """Check if file extension is allowed"""
    return any(filename.lower().endswith(ext) for ext in GALLERY_CONFIG["allowed_extensions"]) 