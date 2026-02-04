from fastapi import APIRouter

router = APIRouter(prefix="/api/venues", tags=["venues"])

@router.get("")
async def list_venues():
    return [
        {
            "id": "venue-caviar-bull",
            "name": "Caviar & Bull",
            "currency": "EUR",
            "timezone": "Europe/Malta",
            "status": "active"
        },
        {
            "id": "venue-tarragon",
            "name": "Tarragon",
            "currency": "EUR",
            "timezone": "Europe/Malta",
            "status": "active"
        }
    ]
