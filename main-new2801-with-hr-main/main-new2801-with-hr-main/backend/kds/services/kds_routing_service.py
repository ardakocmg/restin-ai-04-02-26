from typing import List, Dict, Any

class KdsRoutingService:
    """Service to determine which stations should receive which items"""
    
    def __init__(self, db):
        self.db = db
        self.station_col = db.kds_stations

    async def get_stations_for_item(self, venue_id: str, item: Dict[str, Any]) -> List[str]:
        """
        Determine which station(s) should receive this item based on routing rules.
        Returns list of station_keys.
        """
        stations = await self.station_col.find(
            {"venue_id": venue_id, "enabled": True},
            {"_id": 0}
        ).to_list(100)
        
        matched_stations = []
        
        for station in stations:
            if self._item_matches_routing(item, station.get("routing_rules", [])):
                matched_stations.append(station["station_key"])
        
        # If no specific routing, send to default station (if exists)
        if not matched_stations:
            default_station = await self.station_col.find_one(
                {"venue_id": venue_id, "station_key": "KITCHEN", "enabled": True}
            )
            if default_station:
                matched_stations.append("KITCHEN")
        
        return matched_stations

    def _item_matches_routing(self, item: Dict[str, Any], routing_rules: List[Dict[str, Any]]) -> bool:
        """
        Check if item matches any of the routing rules.
        Routing rules format: [{"type": "category", "values": ["Appetizers", "Salads"]}]
        """
        if not routing_rules:
            return False
        
        for rule in routing_rules:
            rule_type = rule.get("type")
            rule_values = rule.get("values", [])
            
            if rule_type == "category":
                item_category = item.get("category", "")
                if item_category in rule_values:
                    return True
            
            elif rule_type == "item_id":
                item_id = item.get("menu_item_id", item.get("item_id", ""))
                if item_id in rule_values:
                    return True
            
            elif rule_type == "tag":
                item_tags = item.get("tags", [])
                if any(tag in rule_values for tag in item_tags):
                    return True
        
        return False
