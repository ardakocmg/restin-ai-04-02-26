"""Feature gate for POS domain"""
from core.errors import feature_disabled

def require_pos_feature(cfg: dict, feature: str):
    if not cfg.get("features", {}).get(feature, False):
        raise feature_disabled(f"pos.{feature}")
