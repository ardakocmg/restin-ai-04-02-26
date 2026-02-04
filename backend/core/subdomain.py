"""
Subdomain routing and middleware for hybrid multi-tenant architecture
Pattern: {venueSlug}-{module}.domain.com
"""
from fastapi import Request, HTTPException
from typing import Optional, Tuple
import re

# Supported modules for subdomain routing
SUPPORTED_MODULES = [
    "pos",           # Point of Sale
    "kds",           # Kitchen Display System
    "admin",         # General Admin
    "management",    # Operations Management
    "inventory",     # Inventory Management
    "accounting",    # Accounting & Finance
    "finance",       # Financial Reports
    "hr",            # Human Resources
    "workforce",     # Workforce Planning
    "analytics",     # Analytics Dashboard
    "reports",       # Detailed Reports
    "crm",           # Customer Relations
    "reputation",    # Reviews & Reputation
    "loyalty",       # Loyalty Program
    "system",        # System Health
    "integrations",  # External Integrations
    "reservations",  # Reservations Management
]

class SubdomainContext:
    """Container for subdomain routing context"""
    def __init__(
        self,
        venue_slug: Optional[str] = None,
        module: Optional[str] = None,
        is_subdomain: bool = False,
        raw_host: Optional[str] = None
    ):
        self.venue_slug = venue_slug
        self.module = module
        self.is_subdomain = is_subdomain
        self.raw_host = raw_host

def parse_subdomain(host: str) -> SubdomainContext:
    """
    Parse subdomain from host header
    
    Patterns:
    - {venue}-{module}.domain.com → venue="venue", module="module"
    - localhost:3000 → no subdomain
    - domain.com → no subdomain
    """
    if not host:
        return SubdomainContext()
    
    # Remove port if present
    host_without_port = host.split(':')[0]
    
    # Skip localhost and IP addresses
    if host_without_port in ('localhost', '127.0.0.1') or host_without_port.startswith('192.168'):
        return SubdomainContext(raw_host=host_without_port)
    
    # Split by dots
    parts = host_without_port.split('.')
    
    # Need at least subdomain.domain.tld (3 parts minimum)
    if len(parts) < 3:
        return SubdomainContext(raw_host=host_without_port)
    
    # Extract subdomain (first part)
    subdomain = parts[0]
    
    # Check if subdomain matches pattern: {venue}-{module}
    pattern = r'^([a-z0-9\-]+)-([a-z]+)$'
    match = re.match(pattern, subdomain)
    
    if not match:
        # Not a valid venue-module pattern
        return SubdomainContext(raw_host=host_without_port)
    
    venue_slug = match.group(1)
    module = match.group(2)
    
    # Validate module
    if module not in SUPPORTED_MODULES:
        return SubdomainContext(
            venue_slug=venue_slug,
            module=module,
            is_subdomain=True,
            raw_host=host_without_port
        )
    
    return SubdomainContext(
        venue_slug=venue_slug,
        module=module,
        is_subdomain=True,
        raw_host=host_without_port
    )

async def subdomain_middleware(request: Request, call_next):
    """
    Middleware to parse subdomain and inject context into request state
    """
    host = request.headers.get('host', '')
    context = parse_subdomain(host)
    
    # Inject subdomain context into request state
    request.state.subdomain = context
    
    # Continue processing
    response = await call_next(request)
    return response

def get_subdomain_context(request: Request) -> SubdomainContext:
    """Get subdomain context from request state"""
    return getattr(request.state, 'subdomain', SubdomainContext())

def require_module(allowed_modules: list):
    """Dependency to require specific module access"""
    def dependency(request: Request) -> SubdomainContext:
        context = get_subdomain_context(request)
        
        if not context.is_subdomain:
            # Not using subdomain routing, allow access
            return context
        
        if context.module not in allowed_modules:
            raise HTTPException(
                status_code=403,
                detail=f"Module '{context.module}' not allowed for this endpoint"
            )
        
        return context
    
    return dependency
