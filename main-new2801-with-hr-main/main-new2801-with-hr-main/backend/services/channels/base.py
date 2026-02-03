from abc import ABC, abstractmethod
from typing import Dict, Any, List
from models.reservations.core import Reservation, ReservationStatus

class BaseChannelAdapter(ABC):
    """
    Abstract Base Class for Reservation Channels.
    Ensures all partners (Google, OpenTable, etc.) interact with the core via a standard contract.
    """
    
    @property
    @abstractmethod
    def channel_id(self) -> str:
        pass

    @abstractmethod
    async def sync_availability(self, venue_id: str, start_date: str, end_date: str):
        """
        Push availability to the external channel (if applicable).
        """
        pass

    @abstractmethod
    async def handle_booking_request(self, payload: Dict[str, Any]) -> Reservation:
        """
        Handle an incoming booking request (Webhook or API call).
        Must return a standardized Reservation object.
        """
        pass

    @abstractmethod
    async def handle_cancellation_request(self, external_booking_id: str) -> bool:
        """
        Handle a cancellation request from the channel.
        """
        pass
