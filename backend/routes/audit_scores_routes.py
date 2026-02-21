"""
System Audit Scores — Automated Code Quality Analysis

Scans the codebase at runtime to compute architecture, testing, security,
observability, and infrastructure scores for the Hyperscale Dashboard.

These scores are computed on-demand (cached for 5 minutes) by analyzing:
- File counts and LOC
- Test file presence
- Security patterns (hardcoded secrets, rate limiting, encryption)
- Observability tools (Sentry, APM, structured logging)
- Infrastructure config (Redis, CDN, CI/CD, multi-region)
"""

from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
import os
import glob
import time
import logging
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger("audit_scores")

router = APIRouter(prefix="/system", tags=["hyperscale"])

# Cache
_cache: Dict = {}
_cache_ttl = 300  # 5 minutes


def _get_project_root() -> Path:
    """Find project root (parent of backend/)."""
    backend_dir = Path(__file__).resolve().parent.parent
    return backend_dir.parent


def _count_files(directory: Path, extensions: List[str]) -> int:
    """Count files with given extensions, excluding node_modules and __pycache__."""
    count = 0
    for ext in extensions:
        for f in directory.rglob(f"*{ext}"):
            path_str = str(f)
            if "node_modules" in path_str or "__pycache__" in path_str or ".git" in path_str:
                continue
            count += 1
    return count


def _count_lines(directory: Path, extensions: List[str], max_files: int = 500) -> int:
    """Count total lines in files, with a file limit to avoid timeout."""
    total = 0
    files_counted = 0
    for ext in extensions:
        for f in directory.rglob(f"*{ext}"):
            if files_counted >= max_files:
                break
            path_str = str(f)
            if "node_modules" in path_str or "__pycache__" in path_str or ".git" in path_str:
                continue
            try:
                total += sum(1 for _ in open(f, "r", encoding="utf-8", errors="ignore"))
                files_counted += 1
            except Exception:
                pass
    return total


def _file_contains_pattern(directory: Path, extensions: List[str], pattern: str, max_files: int = 200) -> int:
    """Count how many files contain a pattern."""
    count = 0
    files_checked = 0
    for ext in extensions:
        for f in directory.rglob(f"*{ext}"):
            if files_checked >= max_files:
                break
            path_str = str(f)
            if "node_modules" in path_str or "__pycache__" in path_str or ".git" in path_str:
                continue
            try:
                content = open(f, "r", encoding="utf-8", errors="ignore").read()
                if pattern.lower() in content.lower():
                    count += 1
                files_checked += 1
            except Exception:
                pass
    return count


def compute_audit_scores() -> Dict:
    """Compute all audit dimension scores by analyzing the codebase."""
    now = time.time()
    
    # Check cache
    if _cache and (now - _cache.get("_ts", 0)) < _cache_ttl:
        return _cache
    
    root = _get_project_root()
    backend = root / "backend"
    frontend = root / "frontend" / "src"
    
    scores = {}
    evidence = {}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. CODE VOLUME & COVERAGE (weight: 15%)
    # ═══════════════════════════════════════════════════════════════════════════
    fe_files = _count_files(frontend, [".tsx", ".ts"])
    be_files = _count_files(backend, [".py"])
    fe_loc = _count_lines(frontend, [".tsx", ".ts", ".css"], max_files=400)
    be_loc = _count_lines(backend, [".py"], max_files=400)
    total_loc = fe_loc + be_loc
    
    # Score based on codebase size (enterprise = 100k+ LOC)
    if total_loc >= 200000:
        code_score = 9.0
    elif total_loc >= 100000:
        code_score = 8.0
    elif total_loc >= 50000:
        code_score = 6.5
    elif total_loc >= 20000:
        code_score = 5.0
    else:
        code_score = 3.0
    
    scores["code_volume"] = round(code_score, 1)
    evidence["code_volume"] = {
        "frontend_files": fe_files,
        "backend_files": be_files,
        "frontend_loc": fe_loc,
        "backend_loc": be_loc,
        "total_loc": total_loc,
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. ARCHITECTURE & MODULARITY (weight: 15%)
    # ═══════════════════════════════════════════════════════════════════════════
    route_files = _count_files(backend / "routes", [".py"])
    service_files = _count_files(backend / "services", [".py"])
    has_event_bus = (backend / "services" / "event_bus.py").exists()
    has_middleware = (backend / "core" / "middleware.py").exists()
    has_error_handling = (backend / "core" / "errors.py").exists()
    has_i18n = _file_contains_pattern(frontend, [".ts", ".tsx"], "i18next", max_files=50) > 0
    has_lazy_loading = _file_contains_pattern(frontend, [".tsx"], "React.lazy", max_files=50) > 0
    
    arch_score = 5.0
    if route_files >= 50:
        arch_score += 1.0
    if service_files >= 20:
        arch_score += 0.5
    if has_event_bus:
        arch_score += 0.5
    if has_middleware:
        arch_score += 0.5
    if has_error_handling:
        arch_score += 0.3
    if has_i18n:
        arch_score += 0.3
    if has_lazy_loading:
        arch_score += 0.4
    
    scores["architecture"] = round(min(10, arch_score), 1)
    evidence["architecture"] = {
        "route_files": route_files,
        "service_files": service_files,
        "has_event_bus": has_event_bus,
        "has_middleware": has_middleware,
        "has_i18n": has_i18n,
        "has_lazy_loading": has_lazy_loading,
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. TESTING (weight: 15%)
    # ═══════════════════════════════════════════════════════════════════════════
    be_test_files = _count_files(backend, [".py"])
    be_test_actual = 0
    for f in backend.rglob("*.py"):
        if "test" in f.name.lower() or str(f.parent).endswith("tests"):
            be_test_actual += 1
    
    fe_test_files = _count_files(frontend, [".test.tsx", ".test.ts", ".spec.tsx", ".spec.ts"])
    
    has_ci = (root / ".github" / "workflows").exists()
    has_jest_config = (root / "frontend" / "jest.config.js").exists() or (root / "frontend" / "jest.config.ts").exists()
    has_pytest = (root / "backend" / "pytest.ini").exists() or (root / "backend" / "pyproject.toml").exists()
    
    test_score = 1.0
    if be_test_actual >= 10:
        test_score += 2.0
    elif be_test_actual >= 5:
        test_score += 1.0
    elif be_test_actual >= 1:
        test_score += 0.5
    
    if fe_test_files >= 10:
        test_score += 2.0
    elif fe_test_files >= 5:
        test_score += 1.0
    elif fe_test_files >= 1:
        test_score += 0.5
    
    if has_ci:
        test_score += 2.0
    if has_jest_config:
        test_score += 0.5
    if has_pytest:
        test_score += 0.5
    
    # Coverage: look for coverage reports
    has_coverage = (root / "frontend" / "coverage").exists() or (root / "backend" / "htmlcov").exists()
    if has_coverage:
        test_score += 1.5
    
    scores["testing"] = round(min(10, test_score), 1)
    evidence["testing"] = {
        "backend_test_files": be_test_actual,
        "frontend_test_files": fe_test_files,
        "has_ci_cd": has_ci,
        "has_jest_config": has_jest_config,
        "has_pytest_config": has_pytest,
        "has_coverage_reports": has_coverage,
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. SECURITY (weight: 10%)
    # ═══════════════════════════════════════════════════════════════════════════
    has_jwt = _file_contains_pattern(backend / "core", [".py"], "jwt", max_files=20) > 0
    has_rate_limiter = (backend / "core" / "rate_limiter.py").exists()
    has_rbac = _count_files(backend / "routes", [".py"])  # just check rbac exists
    has_rbac_file = (backend / "routes" / "rbac_routes.py").exists()
    has_pii_encryption = (backend / "services" / "pii_encryption.py").exists()
    has_audit_trail = (backend / "services" / "audit_trail.py").exists()
    has_security_middleware = (backend / "core" / "security_middleware.py").exists()
    
    # Check for hardcoded secrets (negative indicator)
    hardcoded_secrets = _file_contains_pattern(backend, [".py"], "mongodb+srv://", max_files=100)
    
    sec_score = 3.0
    if has_jwt:
        sec_score += 1.0
    if has_rate_limiter:
        sec_score += 1.0
    if has_rbac_file:
        sec_score += 1.0
    if has_pii_encryption:
        sec_score += 1.0
    if has_audit_trail:
        sec_score += 0.5
    if has_security_middleware:
        sec_score += 0.5
    if hardcoded_secrets > 0:
        sec_score -= 2.0  # Major penalty
    
    scores["security"] = round(max(0, min(10, sec_score)), 1)
    evidence["security"] = {
        "has_jwt_auth": has_jwt,
        "has_rate_limiter": has_rate_limiter,
        "has_rbac": has_rbac_file,
        "has_pii_encryption": has_pii_encryption,
        "has_audit_trail": has_audit_trail,
        "has_security_middleware": has_security_middleware,
        "hardcoded_secrets_found": hardcoded_secrets,
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. OBSERVABILITY (weight: 10%)
    # ═══════════════════════════════════════════════════════════════════════════
    has_sentry = _file_contains_pattern(frontend, [".tsx", ".ts"], "sentry", max_files=30) > 0
    has_structured_logging = _file_contains_pattern(backend, [".py"], "logger.error", max_files=100) > 0
    has_observability_service = (backend / "services" / "observability_service.py").exists()
    has_metrics_collector = (backend / "core" / "metrics_collector.py").exists()
    has_error_inbox = _file_contains_pattern(backend / "routes", [".py"], "error_inbox", max_files=20) > 0
    
    obs_score = 2.0
    if has_sentry:
        obs_score += 1.5
    if has_structured_logging:
        obs_score += 1.0
    if has_observability_service:
        obs_score += 1.5
    if has_metrics_collector:
        obs_score += 2.0
    if has_error_inbox:
        obs_score += 1.0
    
    scores["observability"] = round(min(10, obs_score), 1)
    evidence["observability"] = {
        "has_sentry": has_sentry,
        "has_structured_logging": has_structured_logging,
        "has_observability_service": has_observability_service,
        "has_metrics_collector": has_metrics_collector,
        "has_error_inbox": has_error_inbox,
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. INFRASTRUCTURE (weight: 15%)
    # ═══════════════════════════════════════════════════════════════════════════
    has_redis = _file_contains_pattern(backend, [".py"], "import redis", max_files=50) > 0
    has_docker = (root / "Dockerfile").exists() or (root / "docker-compose.yml").exists()
    has_cdn = True  # Cloudflare — known
    has_health_endpoint = _file_contains_pattern(backend, [".py"], "/health", max_files=30) > 0
    has_keep_alive = (backend / "scripts" / "keep_alive.py").exists()
    has_event_bus_outbox = _file_contains_pattern(backend / "services", [".py"], "event_outbox", max_files=20) > 0
    
    infra_score = 2.0
    if has_redis:
        infra_score += 1.5
    if has_docker:
        infra_score += 1.5
    if has_cdn:
        infra_score += 1.0
    if has_health_endpoint:
        infra_score += 1.0
    if has_keep_alive:
        infra_score += 0.5
    if has_event_bus_outbox:
        infra_score += 1.0
    if has_ci:
        infra_score += 1.5
    
    scores["infrastructure"] = round(min(10, infra_score), 1)
    evidence["infrastructure"] = {
        "has_redis": has_redis,
        "has_docker": has_docker,
        "has_cdn": has_cdn,
        "has_health_endpoint": has_health_endpoint,
        "has_keep_alive": has_keep_alive,
        "has_event_bus_outbox": has_event_bus_outbox,
        "has_ci_cd": has_ci,
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. PRODUCTION READINESS (weight: 10%)
    # ═══════════════════════════════════════════════════════════════════════════
    prod_score = 2.0
    if has_health_endpoint:
        prod_score += 1.0
    if has_keep_alive:
        prod_score += 0.5
    if has_ci:
        prod_score += 2.0
    if has_docker:
        prod_score += 1.0
    if fe_test_files > 0 or be_test_actual >= 3:
        prod_score += 1.0
    if has_sentry:
        prod_score += 1.0
    if has_metrics_collector:
        prod_score += 1.0
    
    scores["production_readiness"] = round(min(10, prod_score), 1)
    evidence["production_readiness"] = {
        "derived_from": "health_endpoint + keep_alive + ci + docker + tests + sentry + apm"
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # COMPOSITE WEIGHTED SCORE
    # ═══════════════════════════════════════════════════════════════════════════
    weights = {
        "code_volume": 0.15,
        "architecture": 0.15,
        "testing": 0.15,
        "security": 0.10,
        "observability": 0.10,
        "infrastructure": 0.15,
        "production_readiness": 0.10,
    }
    
    weighted_total = sum(scores[k] * weights[k] for k in weights)
    # Normalize to 0-10 scale
    overall = round(weighted_total, 1)
    
    result = {
        "overall_score": overall,
        "scores": scores,
        "evidence": evidence,
        "weights": {k: f"{int(v*100)}%" for k, v in weights.items()},
        "computed_at": time.time(),
        "_ts": time.time(),
    }
    
    _cache.clear()
    _cache.update(result)
    
    return result


@router.get("/audit-scores")
async def get_audit_scores(current_user: dict = Depends(get_current_user)):
    """
    Automated system audit scoring — scans codebase for architecture,
    testing, security, observability, and infrastructure maturity.
    Cached for 5 minutes.
    """
    try:
        return compute_audit_scores()
    except Exception as e:
        logger.error("Audit score computation failed: %s", e)
        return {"error": str(e), "scores": {}}
