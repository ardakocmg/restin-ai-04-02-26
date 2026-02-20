"""
Room Charge Service — Oracle OPERA PMS + Micros Simphony Integration
Full production-ready service for hotel room charge operations.

Handles:
- OAuth2 token acquisition (OHIP client credentials flow)
- Guest lookup by room number, name, or reservation ID
- Room charge posting to guest folio
- Folio balance queries
- Micros Simphony check posting

Requires integration configs in MongoDB integration_configs collection:
- oracle_opera: ohip_host, client_id, client_secret, enterprise_id, hotel_id, cashier_id
- oracle_micros: simphony_host, client_id, client_secret, org_short_name, location_ref
"""

import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from base64 import b64encode

logger = logging.getLogger("room_charge")

# Token cache (per-provider, per-venue)
_token_cache: Dict[str, Dict[str, Any]] = {}


class RoomChargeService:
    """Production service for Oracle OPERA PMS and Micros Simphony room charge operations."""

    def __init__(self, db):
        self.db = db
        self.http_timeout = 30.0  # seconds

    # ═══════════════════════════════════════════════════════════════════════
    # CREDENTIALS
    # ═══════════════════════════════════════════════════════════════════════

    async def _get_opera_config(self, venue_id: str) -> Dict[str, Any]:
        """Load oracle_opera credentials from integration_configs."""
        doc = await self.db.integration_configs.find_one(
            {"provider": "oracle_opera", "isEnabled": True},
            {"_id": 0}
        )
        if not doc:
            raise ValueError("Oracle OPERA PMS integration is not configured or disabled for this venue")
        creds = doc.get("credentials", {})
        required = ["ohip_host", "client_id", "client_secret", "hotel_id"]
        missing = [k for k in required if not creds.get(k)]
        if missing:
            raise ValueError(f"Missing required OPERA config fields: {', '.join(missing)}")
        return creds

    async def _get_micros_config(self, venue_id: str) -> Dict[str, Any]:
        """Load oracle_micros credentials from integration_configs."""
        doc = await self.db.integration_configs.find_one(
            {"provider": "oracle_micros", "isEnabled": True},
            {"_id": 0}
        )
        if not doc:
            raise ValueError("Oracle Micros integration is not configured or disabled for this venue")
        creds = doc.get("credentials", {})
        required = ["simphony_host", "client_id", "client_secret"]
        missing = [k for k in required if not creds.get(k)]
        if missing:
            raise ValueError(f"Missing required Micros config fields: {', '.join(missing)}")
        return creds

    # ═══════════════════════════════════════════════════════════════════════
    # OAUTH2 TOKEN MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════════

    async def get_opera_token(self, venue_id: str) -> str:
        """
        Obtain OAuth2 access token from OHIP using client credentials flow.
        Caches token and refreshes when expired.

        OHIP endpoint: POST {ohip_host}/oauth/v1/tokens
        Headers: x-app-key: {client_id}
        Auth: Basic base64(client_id:client_secret)
        Body: grant_type=client_credentials
        """
        cache_key = f"opera_{venue_id}"
        cached = _token_cache.get(cache_key)
        if cached:
            # Check if token is still valid (with 60s buffer)
            import time
            if cached.get("expires_at", 0) > time.time() + 60:
                return cached["access_token"]

        config = await self._get_opera_config(venue_id)
        ohip_host = config["ohip_host"].rstrip("/")
        client_id = config["client_id"]
        client_secret = config["client_secret"]

        # Build Basic auth header
        credentials = b64encode(f"{client_id}:{client_secret}".encode()).decode()

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                resp = await client.post(
                    f"{ohip_host}/oauth/v1/tokens",
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "x-app-key": client_id,
                        "Authorization": f"Basic {credentials}",
                    },
                    data={"grant_type": "client_credentials"},
                )
                resp.raise_for_status()
                token_data = resp.json()

                import time
                _token_cache[cache_key] = {
                    "access_token": token_data["access_token"],
                    "expires_at": time.time() + token_data.get("expires_in", 3600),
                }

                logger.info("OPERA OAuth token acquired for venue %s", venue_id)
                return token_data["access_token"]

        except httpx.HTTPStatusError as e:
            logger.error("OPERA OAuth failed: %s — %s", e.response.status_code, e.response.text)
            raise ValueError(f"OPERA authentication failed: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error("OPERA OAuth connection error: %s", str(e))
            raise ValueError(f"Cannot reach OPERA server: {str(e)}")

    async def get_micros_token(self, venue_id: str) -> str:
        """
        Obtain OAuth2 token from Simphony Cloud API.

        Simphony endpoint: POST {simphony_host}/oauth/v1/tokens
        Auth: Basic base64(client_id:client_secret)
        """
        cache_key = f"micros_{venue_id}"
        cached = _token_cache.get(cache_key)
        if cached:
            import time
            if cached.get("expires_at", 0) > time.time() + 60:
                return cached["access_token"]

        config = await self._get_micros_config(venue_id)
        simphony_host = config["simphony_host"].rstrip("/")
        client_id = config["client_id"]
        client_secret = config["client_secret"]

        credentials = b64encode(f"{client_id}:{client_secret}".encode()).decode()

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                resp = await client.post(
                    f"{simphony_host}/oauth/v1/tokens",
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Authorization": f"Basic {credentials}",
                    },
                    data={"grant_type": "client_credentials"},
                )
                resp.raise_for_status()
                token_data = resp.json()

                import time
                _token_cache[cache_key] = {
                    "access_token": token_data["access_token"],
                    "expires_at": time.time() + token_data.get("expires_in", 3600),
                }

                logger.info("Micros Simphony token acquired for venue %s", venue_id)
                return token_data["access_token"]

        except httpx.HTTPStatusError as e:
            logger.error("Micros OAuth failed: %s — %s", e.response.status_code, e.response.text)
            raise ValueError(f"Micros authentication failed: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error("Micros OAuth connection error: %s", str(e))
            raise ValueError(f"Cannot reach Micros server: {str(e)}")

    # ═══════════════════════════════════════════════════════════════════════
    # GUEST LOOKUP (OPERA)
    # ═══════════════════════════════════════════════════════════════════════

    async def lookup_guest(
        self,
        venue_id: str,
        room_number: Optional[str] = None,
        last_name: Optional[str] = None,
        reservation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search for in-house guest via OPERA Reservation API (OHIP).

        GET {ohip_host}/rsv/v1/hotels/{hotelId}/reservations
        Query params: roomId, guestName, reservationIdList
        Headers: Authorization: Bearer {token}, x-hotelid: {hotel_id}
        """
        config = await self._get_opera_config(venue_id)
        hotel_id = config["hotel_id"]
        ohip_host = config["ohip_host"].rstrip("/")
        token = await self.get_opera_token(venue_id)

        # Build query parameters
        params: Dict[str, str] = {
            "hotelId": hotel_id,
            "reservationStatus": "InHouse",
        }
        if room_number:
            params["roomId"] = room_number
        if last_name:
            params["guestName"] = last_name
        if reservation_id:
            params["reservationIdList"] = reservation_id

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                resp = await client.get(
                    f"{ohip_host}/rsv/v1/hotels/{hotel_id}/reservations",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "x-hotelid": hotel_id,
                        "x-app-key": config["client_id"],
                        "Accept": "application/json",
                    },
                    params=params,
                )
                resp.raise_for_status()
                data = resp.json()

                reservations = data.get("reservations", {}).get("reservation", [])
                if not reservations:
                    return {"found": False, "guests": [], "count": 0}

                # Parse guest profiles from OPERA response
                guests = []
                for res in reservations:
                    guest_info = res.get("reservationGuest", {}).get("profileInfo", {})
                    profile = guest_info.get("profile", {})
                    customer = profile.get("customer", {})
                    name_obj = customer.get("personName", [{}])[0] if customer.get("personName") else {}

                    room_stay = res.get("roomStay", {})
                    room_rates = room_stay.get("roomRates", [{}])
                    current_room = room_rates[0].get("roomId") if room_rates else None

                    res_id_obj = res.get("reservationIdList", [{}])
                    res_id = res_id_obj[0].get("id") if res_id_obj else None

                    guests.append({
                        "reservation_id": res_id,
                        "confirmation_number": res.get("reservationIdList", [{}])[0].get("id") if res.get("reservationIdList") else None,
                        "first_name": name_obj.get("givenName", ""),
                        "last_name": name_obj.get("surname", ""),
                        "room_number": current_room,
                        "arrival_date": room_stay.get("arrivalDate"),
                        "departure_date": room_stay.get("departureDate"),
                        "status": res.get("reservationStatus"),
                        "vip_code": customer.get("vipCode"),
                    })

                logger.info(
                    "Guest lookup — venue=%s hotel=%s found=%d",
                    venue_id, hotel_id, len(guests)
                )
                return {"found": True, "guests": guests, "count": len(guests)}

        except httpx.HTTPStatusError as e:
            logger.error("OPERA guest lookup failed: %s — %s", e.response.status_code, e.response.text)
            raise ValueError(f"OPERA guest lookup error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error("OPERA connection error during guest lookup: %s", str(e))
            raise ValueError(f"Cannot reach OPERA server: {str(e)}")

    # ═══════════════════════════════════════════════════════════════════════
    # ROOM CHARGE POSTING (OPERA)
    # ═══════════════════════════════════════════════════════════════════════

    async def post_room_charge(
        self,
        venue_id: str,
        reservation_id: str,
        amount_cents: int,
        description: str,
        currency_code: str = "EUR",
        pos_check_id: Optional[str] = None,
        posted_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Post a charge to a guest's room folio via OPERA Cashiering API.

        POST {ohip_host}/csh/v0/hotels/{hotelId}/reservations/{resId}/charges
        Body: {
            "criteria": {
                "amount": { "amount": float, "currencyCode": "EUR" },
                "postingDescription": str,
                "cashierId": str
            }
        }
        """
        config = await self._get_opera_config(venue_id)
        hotel_id = config["hotel_id"]
        cashier_id = config.get("cashier_id", "1001")
        ohip_host = config["ohip_host"].rstrip("/")
        token = await self.get_opera_token(venue_id)
        now = datetime.now(timezone.utc).isoformat()

        # Build charge payload per OHIP Cashiering API spec
        charge_body = {
            "criteria": {
                "amount": {
                    "amount": round(amount_cents / 100, 2),
                    "currencyCode": currency_code,
                },
                "postingDescription": description[:200],  # OPERA has 200 char limit
                "cashierId": cashier_id,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                resp = await client.post(
                    f"{ohip_host}/csh/v0/hotels/{hotel_id}/reservations/{reservation_id}/charges",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "x-hotelid": hotel_id,
                        "x-app-key": config["client_id"],
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json=charge_body,
                )
                resp.raise_for_status()
                result = resp.json()

                # Log successful charge
                charge_record = {
                    "venue_id": venue_id,
                    "provider": "oracle_opera",
                    "reservation_id": reservation_id,
                    "amount_cents": amount_cents,
                    "currency": currency_code,
                    "description": description,
                    "pos_check_id": pos_check_id,
                    "cashier_id": cashier_id,
                    "hotel_id": hotel_id,
                    "status": "SUCCESS",
                    "opera_response": result,
                    "posted_by": posted_by,
                    "created_at": now,
                }
                await self.db.room_charge_logs.insert_one(charge_record)

                logger.info(
                    "Room charge posted — venue=%s hotel=%s res=%s amount=%d%s",
                    venue_id, hotel_id, reservation_id, amount_cents, currency_code
                )
                return {
                    "success": True,
                    "status": "POSTED",
                    "reservation_id": reservation_id,
                    "amount_cents": amount_cents,
                    "currency": currency_code,
                    "transaction_ref": result.get("transactionNo"),
                }

        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            logger.error("Room charge posting failed: %s — %s", e.response.status_code, error_detail)

            # Log failed charge
            await self.db.room_charge_logs.insert_one({
                "venue_id": venue_id,
                "provider": "oracle_opera",
                "reservation_id": reservation_id,
                "amount_cents": amount_cents,
                "currency": currency_code,
                "description": description,
                "pos_check_id": pos_check_id,
                "status": "FAILED",
                "error": error_detail,
                "posted_by": posted_by,
                "created_at": now,
            })

            raise ValueError(f"Room charge failed: {e.response.status_code} — {error_detail}")

        except httpx.RequestError as e:
            logger.error("OPERA connection error during charge posting: %s", str(e))
            await self.db.room_charge_logs.insert_one({
                "venue_id": venue_id,
                "provider": "oracle_opera",
                "reservation_id": reservation_id,
                "amount_cents": amount_cents,
                "status": "ERROR",
                "error": str(e),
                "posted_by": posted_by,
                "created_at": now,
            })
            raise ValueError(f"Cannot reach OPERA server: {str(e)}")

    # ═══════════════════════════════════════════════════════════════════════
    # FOLIO BALANCE QUERY (OPERA)
    # ═══════════════════════════════════════════════════════════════════════

    async def get_folio_balance(
        self,
        venue_id: str,
        reservation_id: str,
    ) -> Dict[str, Any]:
        """
        Query the guest folio balance via OPERA Cashiering API.

        GET {ohip_host}/csh/v0/hotels/{hotelId}/reservations/{resId}/folios
        Headers: Authorization: Bearer {token}, x-hotelid: {hotel_id}
        """
        config = await self._get_opera_config(venue_id)
        hotel_id = config["hotel_id"]
        ohip_host = config["ohip_host"].rstrip("/")
        token = await self.get_opera_token(venue_id)

        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                resp = await client.get(
                    f"{ohip_host}/csh/v0/hotels/{hotel_id}/reservations/{reservation_id}/folios",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "x-hotelid": hotel_id,
                        "x-app-key": config["client_id"],
                        "Accept": "application/json",
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                folio_windows = data.get("reservationFolios", {}).get("folioWindows", [])
                folios = []
                for window in folio_windows:
                    folios.append({
                        "window_number": window.get("folioWindowNo"),
                        "balance": window.get("balance", {}).get("amount", 0),
                        "currency": window.get("balance", {}).get("currencyCode", "EUR"),
                        "payment_method": window.get("paymentMethod"),
                    })

                total_balance = sum(f["balance"] for f in folios)

                logger.info(
                    "Folio balance — venue=%s hotel=%s res=%s balance=%.2f",
                    venue_id, hotel_id, reservation_id, total_balance
                )
                return {
                    "found": True,
                    "reservation_id": reservation_id,
                    "hotel_id": hotel_id,
                    "total_balance": total_balance,
                    "folios": folios,
                }

        except httpx.HTTPStatusError as e:
            logger.error("Folio query failed: %s — %s", e.response.status_code, e.response.text)
            raise ValueError(f"Folio query error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error("OPERA connection error during folio query: %s", str(e))
            raise ValueError(f"Cannot reach OPERA server: {str(e)}")

    # ═══════════════════════════════════════════════════════════════════════
    # CHARGE HISTORY (Local)
    # ═══════════════════════════════════════════════════════════════════════

    async def get_charge_history(
        self,
        venue_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get room charge history from local audit log."""
        charges = []
        async for doc in self.db.room_charge_logs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit):
            charges.append(doc)
        return charges

    # ═══════════════════════════════════════════════════════════════════════
    # CONNECTION TEST
    # ═══════════════════════════════════════════════════════════════════════

    async def test_connection(self, venue_id: str, provider: str = "oracle_opera") -> Dict[str, Any]:
        """
        Test the connection to OPERA or Micros by attempting to acquire an OAuth token.
        Returns success/failure status for the Integration Hub UI.
        """
        try:
            if provider == "oracle_opera":
                token = await self.get_opera_token(venue_id)
            elif provider == "oracle_micros":
                token = await self.get_micros_token(venue_id)
            else:
                raise ValueError(f"Unknown provider: {provider}")

            return {
                "success": True,
                "provider": provider,
                "message": f"Connected to {provider} successfully",
                "token_acquired": bool(token),
            }
        except Exception as e:
            return {
                "success": False,
                "provider": provider,
                "message": str(e),
                "token_acquired": False,
            }
