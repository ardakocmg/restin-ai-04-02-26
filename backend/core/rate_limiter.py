from fastapi import Request, HTTPException
import time
from collections import defaultdict
import functools

# In-memory rate limiting dictionary
# Format: { "ip_address": [timestamp1, timestamp2, ...] }
_rate_limits = defaultdict(list)

def strict_rate_limit(max_requests: int = 5, window_seconds: int = 60):
    """
    FastAPI dependency decorator to limit requests per IP address.
    Cleans up old timestamps automatically.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request object from kwargs (FastAPI injects this if in signature)
            request: Request = kwargs.get("request")
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
                    
            if not request:
                # If no request object found, we can't rate limit by IP
                return await func(*args, **kwargs)
                
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()
            
            # Clean up old requests outside the window
            _rate_limits[client_ip] = [
                ts for ts in _rate_limits[client_ip] 
                if now - ts <= window_seconds
            ]
            
            # Check limit
            if len(_rate_limits[client_ip]) >= max_requests:
                raise HTTPException(
                    status_code=429, 
                    detail="Too many requests. Please try again later."
                )
                
            # Add current request
            _rate_limits[client_ip].append(now)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
