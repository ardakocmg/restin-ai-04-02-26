"""Feature flag enforcement"""
from core.errors import feature_disabled

def require_feature(cfg: dict, feature: str, module: str):
    if not bool(cfg.get("features", {}).get(feature, False)):
        raise feature_disabled(module)
