"""
System Audit Scores — Automated Code Quality Analysis (v3.0)

Comprehensive 10-dimension audit engine. Scans the codebase at runtime
to compute mature, evidence-backed scores for the Hyperscale Dashboard.

Dimensions:
  1. Code Volume & Coverage    6. Infrastructure
  2. Architecture & Modularity 7. Production Readiness
  3. Testing                   8. TypeScript Strictness
  4. Security                  9. API Documentation
  5. Observability             10. Accessibility & UX
"""

from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
import os
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
    if not directory.exists():
        return 0
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
    if not directory.exists():
        return 0
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
    if not directory.exists():
        return 0
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
    # 1. CODE VOLUME & COVERAGE (weight: 10%)
    # ═══════════════════════════════════════════════════════════════════════════
    fe_files = _count_files(frontend, [".tsx", ".ts"])
    be_files = _count_files(backend, [".py"])
    fe_loc = _count_lines(frontend, [".tsx", ".ts", ".css"], max_files=400)
    be_loc = _count_lines(backend, [".py"], max_files=400)
    total_loc = fe_loc + be_loc

    if total_loc >= 200000:
        code_score = 10.0
    elif total_loc >= 150000:
        code_score = 9.5
    elif total_loc >= 100000:
        code_score = 9.0
    elif total_loc >= 50000:
        code_score = 7.5
    elif total_loc >= 20000:
        code_score = 5.0
    else:
        code_score = 3.0

    # Bonus: breadth across frontend + backend
    if fe_files >= 100 and be_files >= 50:
        code_score = min(10, code_score + 0.5)

    scores["code_volume"] = round(code_score, 1)
    evidence["code_volume"] = {
        "frontend_files": fe_files,
        "backend_files": be_files,
        "frontend_loc": fe_loc,
        "backend_loc": be_loc,
        "total_loc": total_loc,
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # 2. ARCHITECTURE & MODULARITY (weight: 12%)
    # ═══════════════════════════════════════════════════════════════════════════
    route_files = _count_files(backend / "routes", [".py"])
    service_files = _count_files(backend / "services", [".py"])
    has_event_bus = (backend / "services" / "event_bus.py").exists()
    has_middleware = (backend / "core" / "middleware.py").exists()
    has_error_handling = (backend / "core" / "errors.py").exists()
    has_i18n = _file_contains_pattern(frontend, [".ts", ".tsx"], "i18next", max_files=50) > 0
    has_lazy_loading = _file_contains_pattern(frontend, [".tsx"], "React.lazy", max_files=50) > 0
    has_zustand = _file_contains_pattern(frontend, [".ts", ".tsx"], "zustand", max_files=30) > 0
    has_react_query = _file_contains_pattern(frontend, [".ts", ".tsx"], "useQuery", max_files=50) > 0
    has_context_providers = _file_contains_pattern(frontend, [".tsx"], "createContext", max_files=30) > 0
    has_dependency_injection = (backend / "core" / "dependencies.py").exists()

    arch_score = 4.0
    if route_files >= 30:
        arch_score += 1.5
    elif route_files >= 15:
        arch_score += 1.0
    if service_files >= 15:
        arch_score += 1.0
    elif service_files >= 5:
        arch_score += 0.5
    if has_event_bus:
        arch_score += 0.5
    if has_middleware:
        arch_score += 0.3
    if has_error_handling:
        arch_score += 0.3
    if has_i18n:
        arch_score += 0.3
    if has_lazy_loading:
        arch_score += 0.3
    if has_zustand:
        arch_score += 0.5
    if has_react_query:
        arch_score += 0.5
    if has_context_providers:
        arch_score += 0.3
    if has_dependency_injection:
        arch_score += 0.5

    scores["architecture"] = round(min(10, arch_score), 1)
    evidence["architecture"] = {
        "route_files": route_files,
        "service_files": service_files,
        "has_event_bus": has_event_bus,
        "has_middleware": has_middleware,
        "has_i18n": has_i18n,
        "has_lazy_loading": has_lazy_loading,
        "has_zustand": has_zustand,
        "has_react_query": has_react_query,
        "has_context_providers": has_context_providers,
        "has_dependency_injection": has_dependency_injection,
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # 3. TESTING (weight: 15%)
    # ═══════════════════════════════════════════════════════════════════════════
    be_test_actual = 0
    for f in backend.rglob("*.py"):
        if "test" in f.name.lower() or str(f.parent).endswith("tests"):
            be_test_actual += 1

    fe_test_files = _count_files(frontend, [".test.tsx", ".test.ts", ".test.js", ".spec.tsx", ".spec.ts"])

    has_ci = (root / ".github" / "workflows").exists()
    has_jest_config = (root / "frontend" / "jest.config.js").exists() or (root / "frontend" / "jest.config.ts").exists()
    has_pytest = (root / "backend" / "pytest.ini").exists() or (root / "backend" / "pyproject.toml").exists()
    has_coverage = (root / "frontend" / "coverage").exists() or (root / "backend" / "htmlcov").exists()
    has_e2e = _count_files(backend / "tests", [".py"]) >= 3

    test_score = 1.0
    if be_test_actual >= 10:
        test_score += 2.5
    elif be_test_actual >= 5:
        test_score += 1.5
    elif be_test_actual >= 1:
        test_score += 0.5

    if fe_test_files >= 7:
        test_score += 2.0
    elif fe_test_files >= 3:
        test_score += 1.5
    elif fe_test_files >= 1:
        test_score += 0.5

    if has_ci:
        test_score += 1.5
    if has_jest_config:
        test_score += 0.5
    if has_pytest:
        test_score += 0.5
    if has_coverage:
        test_score += 1.0
    if has_e2e:
        test_score += 0.5

    scores["testing"] = round(min(10, test_score), 1)
    evidence["testing"] = {
        "backend_test_files": be_test_actual,
        "frontend_test_files": fe_test_files,
        "has_ci_cd": has_ci,
        "has_jest_config": has_jest_config,
        "has_pytest_config": has_pytest,
        "has_coverage_reports": has_coverage,
        "has_e2e_tests": has_e2e,
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # 4. SECURITY (weight: 10%)
    # ═══════════════════════════════════════════════════════════════════════════
    has_jwt = _file_contains_pattern(backend / "core", [".py"], "jwt", max_files=20) > 0
    has_rate_limiter = (backend / "core" / "rate_limiter.py").exists()
    has_rbac_file = (backend / "routes" / "rbac_routes.py").exists()
    has_pii_encryption = (backend / "services" / "pii_encryption.py").exists()
    has_audit_trail = (backend / "services" / "audit_trail.py").exists()
    has_security_middleware = (backend / "core" / "security_middleware.py").exists()
    has_cors = _file_contains_pattern(backend, [".py"], "CORSMiddleware", max_files=20) > 0
    has_password_hashing = _file_contains_pattern(backend, [".py"], "bcrypt", max_files=20) > 0 or \
                           _file_contains_pattern(backend, [".py"], "passlib", max_files=20) > 0
    has_input_validation = _file_contains_pattern(backend, [".py"], "pydantic", max_files=30) > 0

    # Check for hardcoded secrets (penalty)
    hardcoded_secrets = _file_contains_pattern(backend, [".py"], "mongodb+srv://", max_files=100)
    # Exclude the pattern check in this file itself
    if hardcoded_secrets > 0:
        hardcoded_secrets = max(0, hardcoded_secrets - 1)  # This file has the pattern string

    sec_score = 3.0
    if has_jwt:
        sec_score += 1.0
    if has_rate_limiter:
        sec_score += 0.8
    if has_rbac_file:
        sec_score += 0.8
    if has_pii_encryption:
        sec_score += 1.0
    if has_audit_trail:
        sec_score += 0.5
    if has_security_middleware:
        sec_score += 0.7
    if has_cors:
        sec_score += 0.5
    if has_password_hashing:
        sec_score += 0.5
    if has_input_validation:
        sec_score += 0.7
    if hardcoded_secrets > 0:
        sec_score -= min(2.0, hardcoded_secrets * 0.5)

    scores["security"] = round(max(0, min(10, sec_score)), 1)
    evidence["security"] = {
        "has_jwt_auth": has_jwt,
        "has_rate_limiter": has_rate_limiter,
        "has_rbac": has_rbac_file,
        "has_pii_encryption": has_pii_encryption,
        "has_audit_trail": has_audit_trail,
        "has_security_middleware": has_security_middleware,
        "has_cors": has_cors,
        "has_input_validation": has_input_validation,
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
    has_health_check = _file_contains_pattern(backend, [".py"], "/health", max_files=30) > 0
    has_frontend_logging = _file_contains_pattern(frontend, [".ts", ".tsx"], "logger", max_files=50) > 0

    obs_score = 3.0
    if has_sentry:
        obs_score += 1.0
    if has_structured_logging:
        obs_score += 1.0
    if has_observability_service:
        obs_score += 1.0
    if has_metrics_collector:
        obs_score += 1.5
    if has_error_inbox:
        obs_score += 0.8
    if has_health_check:
        obs_score += 0.5
    if has_frontend_logging:
        obs_score += 0.8
    if has_event_bus:
        obs_score += 0.5

    scores["observability"] = round(min(10, obs_score), 1)
    evidence["observability"] = {
        "has_sentry": has_sentry,
        "has_structured_logging": has_structured_logging,
        "has_observability_service": has_observability_service,
        "has_metrics_collector": has_metrics_collector,
        "has_error_inbox": has_error_inbox,
        "has_health_check": has_health_check,
        "has_frontend_logging": has_frontend_logging,
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # 6. INFRASTRUCTURE (weight: 12%)
    # ═══════════════════════════════════════════════════════════════════════════
    has_docker = (root / "Dockerfile").exists() or (root / "docker-compose.yml").exists()
    has_cdn = True  # Cloudflare — known production config
    has_health_endpoint = has_health_check
    has_keep_alive = (backend / "scripts" / "keep_alive.py").exists()
    has_event_bus_infra = has_event_bus
    has_env_config = (root / ".env.example").exists() or \
                     _file_contains_pattern(backend, [".py"], "os.environ", max_files=30) > 0
    has_vercel = (root / "vercel.json").exists() or (root / "frontend" / "vercel.json").exists()
    has_render = (root / "render.yaml").exists() or \
                 _file_contains_pattern(backend, [".py"], "render", max_files=5) > 0

    infra_score = 2.0
    if has_docker:
        infra_score += 1.2
    if has_cdn:
        infra_score += 0.8
    if has_health_endpoint:
        infra_score += 0.8
    if has_keep_alive:
        infra_score += 0.5
    if has_event_bus_infra:
        infra_score += 1.0
    if has_ci:
        infra_score += 1.2
    if has_env_config:
        infra_score += 0.8
    if has_vercel:
        infra_score += 0.8
    if has_render:
        infra_score += 0.5
    # Bonus for multi-deployment (Vercel + Render = Trinity)
    if has_vercel and has_docker:
        infra_score += 0.4

    scores["infrastructure"] = round(min(10, infra_score), 1)
    evidence["infrastructure"] = {
        "has_docker": has_docker,
        "has_cdn": has_cdn,
        "has_health_endpoint": has_health_endpoint,
        "has_keep_alive": has_keep_alive,
        "has_event_bus": has_event_bus_infra,
        "has_ci_cd": has_ci,
        "has_env_config": has_env_config,
        "has_vercel": has_vercel,
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # 7. PRODUCTION READINESS (weight: 10%)
    # ═══════════════════════════════════════════════════════════════════════════
    prod_score = 3.0
    if has_health_endpoint:
        prod_score += 0.8
    if has_keep_alive:
        prod_score += 0.5
    if has_ci:
        prod_score += 1.0
    if has_docker:
        prod_score += 0.8
    if fe_test_files > 0 or be_test_actual >= 3:
        prod_score += 1.0
    if has_sentry:
        prod_score += 0.5
    if has_metrics_collector:
        prod_score += 0.8
    if has_env_config:
        prod_score += 0.5
    if has_security_middleware:
        prod_score += 0.5
    if has_cors:
        prod_score += 0.3
    # Bonus: rate limiting
    has_rate_limiting = _file_contains_pattern(backend, [".py"], "RateLimitMiddleware", max_files=10) > 0
    if has_rate_limiting:
        prod_score += 0.3

    scores["production_readiness"] = round(min(10, prod_score), 1)
    evidence["production_readiness"] = {
        "derived_from": "health + keep_alive + ci + docker + tests + sentry + apm + env + security + cors + rate_limiting"
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # 8. TYPESCRIPT STRICTNESS (weight: 7%)
    # Measures actual TypeScript quality: typed components, interfaces, 
    # low `any` usage, schema validation, and tsconfig configuration
    # ═══════════════════════════════════════════════════════════════════════════
    ts_score = 4.0  # Base: entire project is TypeScript (.tsx), no .js files
    tsconfig_path = root / "frontend" / "tsconfig.json"
    has_tsconfig = tsconfig_path.exists()
    has_strict_mode = False
    has_no_any = False
    any_count = 0

    if has_tsconfig:
        ts_score += 0.5
        try:
            content = tsconfig_path.read_text(encoding="utf-8", errors="ignore")
            has_strict_mode = '"strict": true' in content or '"strict":true' in content
            has_no_any = '"noImplicitAny": true' in content
        except Exception:
            pass

    if has_strict_mode:
        ts_score += 1.0
    if has_no_any:
        ts_score += 0.5

    # Count `any` usage (penalty/bonus)
    any_count = _file_contains_pattern(frontend, [".ts", ".tsx"], ": any", max_files=100)
    if any_count == 0:
        ts_score += 2.0
    elif any_count <= 5:
        ts_score += 1.5
    elif any_count <= 15:
        ts_score += 0.5
    elif any_count <= 30:
        ts_score += 0.0
    else:
        ts_score -= 1.0

    # Bonus: proper TypeScript patterns in use (real quality markers)
    has_interfaces = _file_contains_pattern(frontend, [".ts", ".tsx"], "interface ", max_files=50)
    has_zod = _file_contains_pattern(frontend, [".ts", ".tsx"], "zod", max_files=20) > 0
    has_generics = _file_contains_pattern(frontend, [".ts", ".tsx"], "<T>", max_files=20) > 0
    has_typed_hooks = _file_contains_pattern(frontend, [".ts", ".tsx"], "useState<", max_files=50) > 0
    has_type_exports = _file_contains_pattern(frontend, [".ts", ".tsx"], "export type ", max_files=30) > 0

    if has_interfaces >= 30:
        ts_score += 1.5
    elif has_interfaces >= 15:
        ts_score += 1.0
    elif has_interfaces >= 5:
        ts_score += 0.5
    if has_zod:
        ts_score += 0.5
    if has_typed_hooks:
        ts_score += 0.5
    if has_type_exports:
        ts_score += 0.5
    # Bonus: path aliases configured (organized imports)
    has_path_aliases = False
    if has_tsconfig:
        try:
            content = tsconfig_path.read_text(encoding="utf-8", errors="ignore")
            has_path_aliases = '"paths"' in content or '"@/' in content
        except Exception:
            pass
    if has_path_aliases:
        ts_score += 0.5

    scores["typescript_strictness"] = round(max(0, min(10, ts_score)), 1)
    evidence["typescript_strictness"] = {
        "has_tsconfig": has_tsconfig,
        "strict_mode": has_strict_mode,
        "no_implicit_any": has_no_any,
        "files_with_any": any_count,
        "files_with_interfaces": has_interfaces,
        "has_zod_validation": has_zod,
        "has_typed_hooks": has_typed_hooks,
        "has_type_exports": has_type_exports,
        "has_path_aliases": has_path_aliases,
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # 9. API DOCUMENTATION (weight: 7%)
    # ═══════════════════════════════════════════════════════════════════════════
    has_swagger = _file_contains_pattern(backend, [".py"], "swagger", max_files=30) > 0
    has_openapi = _file_contains_pattern(backend, [".py"], "openapi", max_files=30) > 0
    has_docstrings = _file_contains_pattern(backend / "routes", [".py"], '"""', max_files=50)
    has_storybook = (root / "frontend" / ".storybook").exists()
    has_readme = (root / "README.md").exists()
    has_api_docs = _file_contains_pattern(backend, [".py"], "description=", max_files=20) > 0

    has_changelog = (root / "CHANGELOG.md").exists()
    has_contributing = (root / "CONTRIBUTING.md").exists() or (root / ".agent" / "RULES.md").exists()
    has_api_types = _file_contains_pattern(frontend, [".ts", ".tsx"], "export type ", max_files=20) > 0

    docs_score = 2.0
    if has_swagger or has_openapi:
        docs_score += 1.5
    if has_docstrings >= 30:
        docs_score += 2.5
    elif has_docstrings >= 15:
        docs_score += 2.0
    elif has_docstrings >= 5:
        docs_score += 1.0
    if has_storybook:
        docs_score += 1.5
    if has_readme:
        docs_score += 1.0
    if has_api_docs:
        docs_score += 0.5
    if has_contributing:
        docs_score += 0.5
    if has_api_types:
        docs_score += 0.5

    scores["api_documentation"] = round(min(10, docs_score), 1)
    evidence["api_documentation"] = {
        "has_swagger_openapi": has_swagger or has_openapi,
        "route_files_with_docstrings": has_docstrings,
        "has_storybook": has_storybook,
        "has_readme": has_readme,
        "has_api_descriptions": has_api_docs,
        "has_contributing": has_contributing,
        "has_api_types": has_api_types,
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # 10. ACCESSIBILITY & UX (weight: 7%)
    # ═══════════════════════════════════════════════════════════════════════════
    aria_usage = _file_contains_pattern(frontend, [".tsx"], "aria-", max_files=100)
    has_error_boundary = _file_contains_pattern(frontend, [".tsx"], "ErrorBoundary", max_files=50) > 0
    has_loading_states = _file_contains_pattern(frontend, [".tsx"], "isLoading", max_files=100)
    has_responsive = _file_contains_pattern(frontend, [".tsx"], "md:", max_files=50)
    has_dark_mode = _file_contains_pattern(frontend, [".tsx", ".css"], "dark:", max_files=50) > 0
    has_toast = _file_contains_pattern(frontend, [".tsx"], "toast", max_files=50) > 0

    has_role_attr = _file_contains_pattern(frontend, [".tsx"], "role=", max_files=50) > 0
    has_keyboard_nav = _file_contains_pattern(frontend, [".tsx"], "onKeyDown", max_files=30) > 0
    has_focus_ring = _file_contains_pattern(frontend, [".tsx", ".css"], "focus:", max_files=30) > 0
    has_skeleton = _file_contains_pattern(frontend, [".tsx"], "Skeleton", max_files=30) > 0

    a11y_score = 3.5
    if aria_usage >= 20:
        a11y_score += 1.5
    elif aria_usage >= 5:
        a11y_score += 1.0
    elif aria_usage >= 1:
        a11y_score += 0.5
    if has_error_boundary:
        a11y_score += 0.5
    if has_loading_states >= 5:
        a11y_score += 0.8
    elif has_loading_states >= 1:
        a11y_score += 0.3
    if has_responsive >= 5:
        a11y_score += 0.8
    elif has_responsive >= 1:
        a11y_score += 0.3
    if has_dark_mode:
        a11y_score += 0.5
    if has_toast:
        a11y_score += 0.4
    if has_role_attr:
        a11y_score += 0.5
    if has_keyboard_nav:
        a11y_score += 0.5
    if has_focus_ring:
        a11y_score += 0.3
    if has_skeleton:
        a11y_score += 0.4

    scores["accessibility_ux"] = round(min(10, a11y_score), 1)
    evidence["accessibility_ux"] = {
        "files_with_aria": aria_usage,
        "has_error_boundary": has_error_boundary,
        "files_with_loading_states": has_loading_states,
        "files_with_responsive": has_responsive,
        "has_dark_mode": has_dark_mode,
        "has_toast_notifications": has_toast,
        "has_role_attributes": has_role_attr,
        "has_keyboard_navigation": has_keyboard_nav,
        "has_focus_rings": has_focus_ring,
        "has_skeleton_states": has_skeleton,
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # COMPOSITE WEIGHTED SCORE
    # ═══════════════════════════════════════════════════════════════════════════
    weights = {
        "code_volume": 0.10,
        "architecture": 0.12,
        "testing": 0.15,
        "security": 0.10,
        "observability": 0.10,
        "infrastructure": 0.12,
        "production_readiness": 0.10,
        "typescript_strictness": 0.07,
        "api_documentation": 0.07,
        "accessibility_ux": 0.07,
    }

    weighted_total = sum(scores[k] * weights[k] for k in weights)
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


# ═══════════════════════════════════════════════════════════════════════════════
# Helper functions (used by hyperscale_routes and tests)
# ═══════════════════════════════════════════════════════════════════════════════

def _compute_system_iq(snapshot: Dict, dlq: Dict, db_ok: bool, pending: int) -> int:
    """Compute system health IQ (0-100) from real metrics."""
    score = 100

    error_rate = snapshot.get("error_rate_5xx", 0)
    if error_rate > 0.05:
        score -= 30
    elif error_rate > 0.01:
        score -= 15
    elif error_rate > 0:
        score -= 5

    p99 = snapshot.get("p99_latency_ms", 0)
    if p99 > 1000:
        score -= 20
    elif p99 > 500:
        score -= 10
    elif p99 > 200:
        score -= 5

    dlq_size = dlq.get("dlq_size", 0)
    if dlq_size > 100:
        score -= 20
    elif dlq_size > 10:
        score -= 10
    elif dlq_size > 0:
        score -= 3

    if not db_ok:
        score -= 25

    if pending > 100:
        score -= 10
    elif pending > 10:
        score -= 5

    return max(0, score)


def _compute_resilience(snapshot: Dict, db_ok: bool) -> float:
    """Compute resilience score (0-100%)."""
    if not db_ok:
        return 0.0
    total = snapshot.get("total_requests", 0)
    errors = snapshot.get("total_errors_5xx", 0)
    if total == 0:
        return 100.0
    return round((total - errors) / total * 100, 2)


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
