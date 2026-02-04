"""Demand Forecasting Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.forecasting import DemandForecast, ForecastMethod, ForecastGranularity, ForecastDataPoint, ForecastRequest
from services.forecasting_engine import forecasting_engine
from services.openai_integration import openai_service


def create_forecasting_router():
    router = APIRouter(tags=["forecasting"])
    
    @router.post("/venues/{venue_id}/forecasting/generate")
    async def generate_forecast(
        venue_id: str,
        forecast_request: ForecastRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        item_id = forecast_request.item_id
        method = forecast_request.method
        days = forecast_request.days
        
        # Get historical data from stock ledger
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        ledger_entries = await db.StockLedger.find(
            {
                "venue_id": venue_id,
                "item_id": item_id,
                "event_type": "STOCK_OUT",
                "timestamp": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
            },
            {"_id": 0}
        ).to_list(10000)
        
        # Aggregate by date
        daily_data = {}
        for entry in ledger_entries:
            date_str = entry["timestamp"][:10]
            if date_str not in daily_data:
                daily_data[date_str] = 0
            daily_data[date_str] += abs(entry.get("quantity", 0))
        
        historical_data = [{"date": date, "quantity": qty} for date, qty in sorted(daily_data.items())]
        quantities = [d["quantity"] for d in historical_data]
        
        # Generate forecast based on method
        if method == "moving_average":
            forecast_values = forecasting_engine.moving_average(quantities, window=7)
        elif method == "exponential_smoothing":
            forecast_values = forecasting_engine.exponential_smoothing(quantities, alpha=0.3, periods=7)
        else:
            forecast_values = [sum(quantities) / len(quantities) if quantities else 0] * 7
        
        # Create forecast data points
        forecast_data = []
        for i, value in enumerate(forecast_values):
            forecast_date = (end_date + timedelta(days=i+1)).isoformat()[:10]
            confidence = forecasting_engine.calculate_confidence_interval(quantities, value)
            forecast_data.append(
                ForecastDataPoint(
                    date=forecast_date,
                    predicted_quantity=value,
                    confidence_lower=confidence["lower"],
                    confidence_upper=confidence["upper"],
                    confidence_level=0.95
                )
            )
        
        # AI insights (if requested)
        ai_insights = None
        if forecast_request.use_ai:
            ai_result = await openai_service.forecast_demand(
                historical_data[-14:],  # Last 2 weeks
                forecast_request.item_name or "Item"
            )
            ai_insights = ai_result.get("analysis", "")
        
        # Create forecast record
        item_data = await db.InventoryItems.find_one({"id": item_id}, {"_id": 0})
        
        forecast = DemandForecast(
            venue_id=venue_id,
            item_id=item_id,
            item_name=item_data.get("name", "Unknown") if item_data else "Unknown",
            method=ForecastMethod(method),
            granularity=ForecastGranularity.DAILY,
            historical_data=historical_data,
            forecast_data=[f.model_dump() for f in forecast_data],
            ai_insights=ai_insights,
            recommended_order_quantity=sum(forecast_values),
            recommended_order_date=(end_date + timedelta(days=2)).isoformat()[:10],
            valid_until=(end_date + timedelta(days=7)).isoformat()
        )
        
        await db.DemandForecasts.insert_one(forecast.model_dump())
        
        return forecast.model_dump()
    
    @router.get("/venues/{venue_id}/forecasting")
    async def list_forecasts(
        venue_id: str,
        item_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if item_id:
            query["item_id"] = item_id
        
        forecasts = await db.DemandForecasts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        return forecasts
    
    @router.get("/venues/{venue_id}/forecasting/seasonal-patterns")
    async def detect_seasonal_patterns(
        venue_id: str,
        item_id: str,
        days: int = 60,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        ledger_entries = await db.StockLedger.find(
            {
                "venue_id": venue_id,
                "item_id": item_id,
                "event_type": "STOCK_OUT",
                "timestamp": {"$gte": start_date.isoformat()}
            },
            {"_id": 0}
        ).to_list(10000)
        
        daily_data = []
        for entry in ledger_entries:
            daily_data.append({
                "date": entry["timestamp"],
                "quantity": abs(entry.get("quantity", 0))
            })
        
        pattern = forecasting_engine.detect_seasonality(daily_data)
        
        return pattern
    
    return router
