"""Unit of Measure Service - Single Source of Truth"""
from decimal import Decimal
from core.errors import bad_request

BASE_UOM = ["G", "ML", "EA"]
PRICING_BASIS = ["KG", "L", "EA", "PORTION"]

CONVERSIONS = {
    ("KG", "G"): 1000,
    ("G", "KG"): 0.001,
    ("L", "ML"): 1000,
    ("ML", "L"): 0.001,
    ("EA", "EA"): 1
}

class UoMService:
    
    @staticmethod
    def to_base_qty(qty: float, uom: str, base_uom: str) -> float:
        """Convert quantity to base UOM"""
        if uom == base_uom:
            return qty
        
        key = (uom, base_uom)
        if key in CONVERSIONS:
            return qty * CONVERSIONS[key]
        
        raise bad_request(f"No conversion from {uom} to {base_uom}")
    
    @staticmethod
    def pack_to_base(pack_qty: float, pack_uom: str, pack_size: float, base_uom: str) -> float:
        """Convert pack quantity to base UOM"""
        # First convert pack_uom to base_uom
        base_per_pack = UoMService.to_base_qty(pack_size, pack_uom, base_uom)
        return pack_qty * base_per_pack
    
    @staticmethod
    def pricing_to_base_price(pack_price: float, pack_uom: str, pack_size: float, base_uom: str) -> float:
        """Calculate base price from pack price"""
        # price per base unit = pack_price / (pack_size in base_uom)
        base_qty = UoMService.to_base_qty(pack_size, pack_uom, base_uom)
        return pack_price / base_qty if base_qty > 0 else 0.0

uom_service = UoMService()
