"""
Gallery API Endpoints
Handles photo gallery operations for Anahi module
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
import os
import json
from datetime import datetime
import shutil

router = APIRouter(prefix="/gallery", tags=["Gallery"])

# Base path for gallery
GALLERY_PATH = "modules/anahi/photos/gallery"

@router.get("/")
async def get_all_photos():
    """Get list of all photos in gallery"""
    try:
        if not os.path.exists(GALLERY_PATH):
            return {"photos": []}
        
        photos = []
        for filename in os.listdir(GALLERY_PATH):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                file_path = os.path.join(GALLERY_PATH, filename)
                file_stat = os.stat(file_path)
                
                photos.append({
                    "filename": filename,
                    "size": file_stat.st_size,
                    "created": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                    "path": f"/static/anahi/gallery/{filename}"
                })
        
        # Sort by creation date (newest first)
        photos.sort(key=lambda x: x['created'], reverse=True)
        
        return {
            "success": True,
            "count": len(photos),
            "photos": photos
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching photos: {str(e)}")

@router.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    """Upload a new photo to gallery"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Create gallery directory if it doesn't exist
        os.makedirs(GALLERY_PATH, exist_ok=True)
        
        # Save file
        file_path = os.path.join(GALLERY_PATH, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "success": True,
            "message": "Photo uploaded successfully",
            "filename": file.filename,
            "path": f"/static/anahi/gallery/{file.filename}"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")

@router.delete("/{filename}")
async def delete_photo(filename: str):
    """Delete a photo from gallery"""
    try:
        file_path = os.path.join(GALLERY_PATH, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Photo not found")
        
        os.remove(file_path)
        
        return {
            "success": True,
            "message": f"Photo {filename} deleted successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting photo: {str(e)}")

@router.get("/stats")
async def get_gallery_stats():
    """Get gallery statistics"""
    try:
        if not os.path.exists(GALLERY_PATH):
            return {"total_photos": 0, "total_size": 0}
        
        total_photos = 0
        total_size = 0
        
        for filename in os.listdir(GALLERY_PATH):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                file_path = os.path.join(GALLERY_PATH, filename)
                total_photos += 1
                total_size += os.path.getsize(file_path)
        
        return {
            "success": True,
            "stats": {
                "total_photos": total_photos,
                "total_size": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "gallery_path": GALLERY_PATH
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}") 