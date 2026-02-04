from datetime import datetime, timezone
from typing import Optional, Dict

class KdsWaitTimeService:
    """Calculate wait times and visual indicators for KDS tickets"""
    
    @staticmethod
    def calculate_wait_time(created_at: str) -> Dict[str, any]:
        """
        Calculate how long a ticket has been waiting.
        Returns: {"minutes": int, "visual_state": "normal"|"delayed"|"late"}
        """
        created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta = now - created
        minutes = int(delta.total_seconds() / 60)
        
        # Default thresholds
        delayed_threshold = 10
        late_threshold = 20
        
        visual_state = "normal"
        if minutes >= late_threshold:
            visual_state = "late"
        elif minutes >= delayed_threshold:
            visual_state = "delayed"
        
        return {
            "minutes": minutes,
            "visual_state": visual_state
        }
    
    @staticmethod
    def calculate_with_settings(created_at: str, delayed_after: int, late_after: int) -> Dict[str, any]:
        """
        Calculate wait time with custom thresholds from station settings.
        """
        created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta = now - created
        minutes = int(delta.total_seconds() / 60)
        
        visual_state = "normal"
        if minutes >= late_after:
            visual_state = "late"
        elif minutes >= delayed_after:
            visual_state = "delayed"
        
        return {
            "minutes": minutes,
            "visual_state": visual_state
        }
