"""
File-based Cache Service for FinanceHub
Cost-effective alternative to Redis for Google Cloud deployment
"""
import os
import json
import pickle
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
from pathlib import Path
import threading
import time

logger = logging.getLogger(__name__)

class FileCacheService:
    """File-based cache service for cost-effective caching"""
    
    def __init__(self, cache_dir: str = "cache", max_size_mb: int = 100, cleanup_interval: int = 3600):
        self.cache_dir = Path(cache_dir)
        self.max_size_mb = max_size_mb
        self.cleanup_interval = cleanup_interval
        self._lock = threading.RLock()
        self._last_cleanup = time.time()
        
        # Create cache directory
        self.cache_dir.mkdir(exist_ok=True)
        
        # Start background cleanup if needed
        self._start_cleanup_thread()
        
        logger.info(f"FileCacheService initialized with cache_dir={cache_dir}, max_size={max_size_mb}MB")
    
    def _get_cache_path(self, key: str) -> Path:
        """Get cache file path for a key"""
        # Create a safe filename from the key
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{key_hash}.cache"
    
    def _get_metadata_path(self, key: str) -> Path:
        """Get metadata file path for a key"""
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{key_hash}.meta"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            with self._lock:
                cache_path = self._get_cache_path(key)
                meta_path = self._get_metadata_path(key)
                
                if not cache_path.exists() or not meta_path.exists():
                    logger.debug(f"[FileCacheService] [GET:{key}] Cache MISS - file not found")
                    return None
                
                # Check metadata for expiration
                with open(meta_path, 'r') as f:
                    metadata = json.load(f)
                
                expires_at = datetime.fromisoformat(metadata['expires_at'])
                if datetime.now() > expires_at:
                    logger.debug(f"[FileCacheService] [GET:{key}] Cache MISS - expired")
                    # Clean up expired files
                    cache_path.unlink(missing_ok=True)
                    meta_path.unlink(missing_ok=True)
                    return None
                
                # Load cached data
                with open(cache_path, 'rb') as f:
                    data = pickle.load(f)
                
                logger.debug(f"[FileCacheService] [GET:{key}] Cache HIT")
                return data
                
        except Exception as e:
            logger.error(f"[FileCacheService] [GET:{key}] Error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        try:
            with self._lock:
                cache_path = self._get_cache_path(key)
                meta_path = self._get_metadata_path(key)
                
                # Create metadata
                expires_at = datetime.now() + timedelta(seconds=ttl)
                metadata = {
                    'key': key,
                    'created_at': datetime.now().isoformat(),
                    'expires_at': expires_at.isoformat(),
                    'ttl': ttl
                }
                
                # Save data
                with open(cache_path, 'wb') as f:
                    pickle.dump(value, f)
                
                # Save metadata
                with open(meta_path, 'w') as f:
                    json.dump(metadata, f)
                
                logger.debug(f"[FileCacheService] [SET:{key}] Cache SET successful. TTL: {ttl}s")
                
                # Trigger cleanup if needed
                self._maybe_cleanup()
                
                return True
                
        except Exception as e:
            logger.error(f"[FileCacheService] [SET:{key}] Error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            with self._lock:
                cache_path = self._get_cache_path(key)
                meta_path = self._get_metadata_path(key)
                
                cache_path.unlink(missing_ok=True)
                meta_path.unlink(missing_ok=True)
                
                logger.debug(f"[FileCacheService] [DELETE:{key}] Cache DELETE successful")
                return True
                
        except Exception as e:
            logger.error(f"[FileCacheService] [DELETE:{key}] Error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            with self._lock:
                cache_path = self._get_cache_path(key)
                meta_path = self._get_metadata_path(key)
                
                if not cache_path.exists() or not meta_path.exists():
                    return False
                
                # Check if expired
                with open(meta_path, 'r') as f:
                    metadata = json.load(f)
                
                expires_at = datetime.fromisoformat(metadata['expires_at'])
                return datetime.now() <= expires_at
                
        except Exception as e:
            logger.error(f"[FileCacheService] [EXISTS:{key}] Error: {e}")
            return False
    
    def _maybe_cleanup(self):
        """Trigger cleanup if needed"""
        current_time = time.time()
        if current_time - self._last_cleanup > self.cleanup_interval:
            self._cleanup_expired()
            self._last_cleanup = current_time
    
    def _cleanup_expired(self):
        """Clean up expired cache files"""
        try:
            with self._lock:
                current_time = datetime.now()
                cleaned_count = 0
                
                for meta_file in self.cache_dir.glob("*.meta"):
                    try:
                        with open(meta_file, 'r') as f:
                            metadata = json.load(f)
                        
                        expires_at = datetime.fromisoformat(metadata['expires_at'])
                        if current_time > expires_at:
                            # Remove both cache and metadata files
                            cache_file = meta_file.with_suffix('.cache')
                            meta_file.unlink(missing_ok=True)
                            cache_file.unlink(missing_ok=True)
                            cleaned_count += 1
                            
                    except Exception as e:
                        logger.warning(f"Error cleaning up {meta_file}: {e}")
                        # Remove corrupted files
                        meta_file.unlink(missing_ok=True)
                        meta_file.with_suffix('.cache').unlink(missing_ok=True)
                
                if cleaned_count > 0:
                    logger.info(f"[FileCacheService] Cleaned up {cleaned_count} expired cache entries")
                
                # Check cache size and clean oldest if needed
                self._enforce_size_limit()
                
        except Exception as e:
            logger.error(f"[FileCacheService] Cleanup error: {e}")
    
    def _enforce_size_limit(self):
        """Enforce cache size limit by removing oldest files"""
        try:
            total_size = sum(f.stat().st_size for f in self.cache_dir.glob("*") if f.is_file())
            max_size_bytes = self.max_size_mb * 1024 * 1024
            
            if total_size <= max_size_bytes:
                return
            
            # Get all cache files with their creation times
            cache_files = []
            for meta_file in self.cache_dir.glob("*.meta"):
                try:
                    with open(meta_file, 'r') as f:
                        metadata = json.load(f)
                    
                    created_at = datetime.fromisoformat(metadata['created_at'])
                    cache_file = meta_file.with_suffix('.cache')
                    
                    if cache_file.exists():
                        file_size = meta_file.stat().st_size + cache_file.stat().st_size
                        cache_files.append((created_at, meta_file, cache_file, file_size))
                        
                except Exception:
                    continue
            
            # Sort by creation time (oldest first)
            cache_files.sort(key=lambda x: x[0])
            
            # Remove oldest files until under size limit
            removed_count = 0
            for created_at, meta_file, cache_file, file_size in cache_files:
                if total_size <= max_size_bytes:
                    break
                
                meta_file.unlink(missing_ok=True)
                cache_file.unlink(missing_ok=True)
                total_size -= file_size
                removed_count += 1
            
            if removed_count > 0:
                logger.info(f"[FileCacheService] Removed {removed_count} old cache entries to enforce size limit")
                
        except Exception as e:
            logger.error(f"[FileCacheService] Size enforcement error: {e}")
    
    def _start_cleanup_thread(self):
        """Start background cleanup thread"""
        def cleanup_worker():
            while True:
                try:
                    time.sleep(self.cleanup_interval)
                    self._cleanup_expired()
                except Exception as e:
                    logger.error(f"[FileCacheService] Background cleanup error: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
        logger.info("[FileCacheService] Background cleanup thread started")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            with self._lock:
                total_size = sum(f.stat().st_size for f in self.cache_dir.glob("*") if f.is_file())
                num_files = len(list(self.cache_dir.glob("*.cache")))
                return {
                    "total_size_mb": round(total_size / (1024 * 1024), 2),
                    "num_files": num_files,
                    "cache_dir": str(self.cache_dir)
                }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}
    
    async def clear(self) -> bool:
        """Clear the entire cache"""
        try:
            with self._lock:
                for f in self.cache_dir.glob("*"):
                    if f.is_file():
                        f.unlink()
                logger.info("[FileCacheService] Cache cleared successfully")
                return True
        except Exception as e:
            logger.error(f"[FileCacheService] Error clearing cache: {e}")
            return False 