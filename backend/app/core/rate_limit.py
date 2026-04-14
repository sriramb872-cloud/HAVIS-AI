import time
import structlog
from typing import Dict, List, Optional
from collections import defaultdict
from fastapi import Request
from app.core.config import settings
from supabase import create_client, Client
from datetime import datetime, timezone

logger = structlog.get_logger(__name__)

class SupabaseRateLimiter:
    """
    Production-safe rate limiter with Supabase backend and in-memory fallback.
    Identifies clients through proxy-safe headers when from trusted sources.
    """
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_KEY
        self.max_requests = settings.RATE_LIMIT_MAX_REQUESTS
        self.window_seconds = settings.RATE_LIMIT_WND_SECONDS
        self.trusted_proxies = set(settings.TRUSTED_PROXIES)
        
        self.supabase: Optional[Client] = None
        self._supabase_available = False
        
        # In-memory fallback state
        self._fallback_store = defaultdict(list)
        
        self._initialize_supabase()

    def _initialize_supabase(self):
        try:
            if self.supabase_url and self.supabase_key:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                self._supabase_available = True
                logger.info("Supabase Rate Limiter initialized", url=self.supabase_url[:30] + "...")
            else:
                raise ValueError("SUPABASE_URL or SUPABASE_KEY is missing")
        except Exception as e:
            self._supabase_available = False
            logger.warning("Supabase unavailable for rate limiting. Falling back to in-memory mode.", error=str(e))

    def get_client_ip(self, request: Request) -> str:
        """
        Proxy-safe client ID resolution. 
        Only trusts X-Forwarded-For if it comes from a trusted host.
        """
        remote_addr = request.client.host if request.client else "unknown"
        
        # Respect X-Forwarded-For only if originating from trusted local/proxy host
        if remote_addr in self.trusted_proxies:
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                # First element in the list is the actual client IP
                return forwarded_for.split(",")[0].strip()
        
        return remote_addr

    async def is_rate_limited(self, client_id: str, route: str = "default") -> bool:
        """
        Checks if the client has exceeded the rate limit.
        Uses Supabase RPC if available, else in-memory fallback.
        """
        if self._supabase_available and self.supabase:
            return await self._check_supabase(client_id, route)
        else:
            return self._check_memory(client_id)

    async def _check_supabase(self, client_id: str, route: str) -> bool:
        try:
            # Calculate window start based on 60 second buckets
            window_start_ts = (int(time.time()) // self.window_seconds) * self.window_seconds
            # Format as ISO string for datestamptz
            window_start = datetime.fromtimestamp(window_start_ts, tz=timezone.utc).isoformat()
            
            response = self.supabase.rpc(
                "increment_rate_limit", 
                {
                    "p_client_id": client_id,
                    "p_route": route,
                    "p_window_start": window_start,
                    "p_max_requests": self.max_requests
                }
            ).execute()
            
            # The RPC returns a boolean indicating if limited
            return response.data
        except Exception as e:
            logger.warning("Supabase operation failed during rate limit check. Falling back.", error=str(e))
            return self._check_memory(client_id)

    def _check_memory(self, client_id: str) -> bool:
        """Original in-memory implementation for fallback."""
        now = time.time()
        # Cleanup old entries for this client
        self._fallback_store[client_id] = [t for t in self._fallback_store[client_id] if now - t < self.window_seconds]
        
        if len(self._fallback_store[client_id]) >= self.max_requests:
            return True
        
        self._fallback_store[client_id].append(now)
        return False

# Singleton instance
limiter = SupabaseRateLimiter()
