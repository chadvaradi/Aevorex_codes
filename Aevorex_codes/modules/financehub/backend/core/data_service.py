"""
Centralized Data Service for FinanceHub
Manages all stock data operations and ensures consistency
"""
import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class DataService:
    """Centralized service for managing stock data consistency"""
    
    def __init__(self, cache_service, stock_data_service, ticker_tape_service):
        self.cache = cache_service
        self.stock_service = stock_data_service
        self.ticker_service = ticker_tape_service
        self._data_cache = {}  # In-memory cache for session
        
    async def get_unified_stock_data(self, symbol: str, include_chart: bool = True) -> Dict[str, Any]:
        """Get unified stock data ensuring consistency across all components"""
        try:
            # Check session cache first
            cache_key = f"unified:{symbol}:{include_chart}"
            if cache_key in self._data_cache:
                cached_data = self._data_cache[cache_key]
                if self._is_cache_valid(cached_data):
                    return cached_data['data']
            
            # Fetch all data concurrently
            tasks = {
                'basic': self._get_basic_data(symbol),
                'fundamentals': self._get_fundamentals_data(symbol),
                'analytics': self._get_analytics_data(symbol)
            }
            
            if include_chart:
                tasks['chart'] = self._get_chart_data(symbol)
            
            results = await asyncio.gather(*tasks.values(), return_exceptions=True)
            
            # Process results
            unified_data = {}
            for i, (key, task) in enumerate(tasks.items()):
                result = results[i]
                if isinstance(result, Exception):
                    logger.warning(f"Error fetching {key} data for {symbol}: {result}")
                    unified_data[key] = None
                else:
                    unified_data[key] = result
            
            # Ensure price consistency
            unified_data = self._ensure_price_consistency(unified_data)
            
            # Cache the result
            self._data_cache[cache_key] = {
                'data': unified_data,
                'timestamp': datetime.now(),
                'ttl': 300  # 5 minutes
            }
            
            return unified_data
            
        except Exception as e:
            logger.error(f"Error getting unified data for {symbol}: {e}")
            return {}
    
    async def _get_basic_data(self, symbol: str) -> Optional[Dict]:
        """Get basic stock data"""
        try:
            # UPDATED: Use new modular fundamentals endpoint instead of deprecated basic_data
            return await self.stock_service.get_stock_fundamentals(symbol)
        except Exception as e:
            logger.error(f"Error fetching fundamentals for {symbol}: {e}")
            return None
    
    async def _get_fundamentals_data(self, symbol: str) -> Optional[Dict]:
        """Get fundamentals data"""
        try:
            return await self.stock_service.get_stock_fundamentals(symbol)
        except Exception as e:
            logger.error(f"Error fetching fundamentals for {symbol}: {e}")
            return None
    
    async def _get_analytics_data(self, symbol: str) -> Optional[Dict]:
        """Get analytics data"""
        try:
            return await self.stock_service.get_stock_analytics(symbol, include_ai=True, include_news=True)
        except Exception as e:
            logger.error(f"Error fetching analytics for {symbol}: {e}")
            return None
    
    async def _get_chart_data(self, symbol: str) -> Optional[Dict]:
        """Get chart data"""
        try:
            return await self.stock_service.get_stock_chart_data(symbol, period='1y', interval='1d')
        except Exception as e:
            logger.error(f"Error fetching chart data for {symbol}: {e}")
            return None
    
    def _ensure_price_consistency(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure price consistency across all data sources"""
        try:
            # Extract price from different sources
            prices = []
            
            # From basic data
            if data.get('basic') and data['basic'].get('price_data'):
                price = data['basic']['price_data'].get('price')
                if price:
                    prices.append(('basic', float(price)))
            
            # From chart data (latest close)
            if data.get('chart') and data['chart'].get('data'):
                chart_data = data['chart']['data']
                if chart_data and len(chart_data) > 0:
                    latest = chart_data[-1]
                    if 'close' in latest:
                        prices.append(('chart', float(latest['close'])))
            
            # Use the most recent/reliable price
            if prices:
                # Prefer basic data price as it's usually most current
                primary_price = next((p[1] for p in prices if p[0] == 'basic'), prices[0][1])
                
                # Update all price references to use consistent value
                if data.get('basic') and data['basic'].get('price_data'):
                    data['basic']['price_data']['price'] = primary_price
                
                # Add unified price field
                data['unified_price'] = primary_price
                
                logger.debug(f"Price consistency ensured: {primary_price}")
            
            return data
            
        except Exception as e:
            logger.error(f"Error ensuring price consistency: {e}")
            return data
    
    def _is_cache_valid(self, cached_item: Dict) -> bool:
        """Check if cached item is still valid"""
        try:
            timestamp = cached_item.get('timestamp')
            ttl = cached_item.get('ttl', 300)
            
            if not timestamp:
                return False
            
            age = (datetime.now() - timestamp).total_seconds()
            return age < ttl
            
        except Exception:
            return False
    
    async def get_ticker_tape_data(self) -> List[Dict[str, Any]]:
        """Get ticker tape data with consistent pricing"""
        try:
            # Get ticker data
            ticker_data = await self.ticker_service.get_ticker_tape_data()
            
            # Ensure price consistency for ticker items
            for ticker in ticker_data:
                symbol = ticker.get('symbol')
                if symbol:
                    # Get latest price from unified data
                    unified_data = await self.get_unified_stock_data(symbol, include_chart=False)
                    if unified_data.get('unified_price'):
                        ticker['price'] = unified_data['unified_price']
                        
                        # Update change calculation if needed
                        if ticker.get('previous_close'):
                            change = unified_data['unified_price'] - ticker['previous_close']
                            change_percent = (change / ticker['previous_close']) * 100
                            ticker['change'] = change
                            ticker['change_percent'] = change_percent
            
            return ticker_data
            
        except Exception as e:
            logger.error(f"Error getting ticker tape data: {e}")
            return []
    
    def clear_session_cache(self):
        """Clear in-memory session cache"""
        self._data_cache.clear()
        logger.info("Session cache cleared") 