"""Demand Forecasting Engine"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import statistics
import math


class ForecastingEngine:
    """Demand forecasting algorithms"""
    
    @staticmethod
    def moving_average(data: List[float], window: int = 7) -> List[float]:
        """Simple moving average"""
        if not data:
            return [0] * window
        if len(data) < window:
            return [statistics.mean(data)] * window
        
        result = []
        for i in range(len(data) - window + 1):
            avg = statistics.mean(data[i:i + window])
            result.append(avg)
        
        # Extend forecast
        last_avg = result[-1] if result else statistics.mean(data)
        for _ in range(window):
            result.append(last_avg)
        
        return result[-window:]
    
    @staticmethod
    def exponential_smoothing(data: List[float], alpha: float = 0.3, periods: int = 7) -> List[float]:
        """Exponential smoothing forecast"""
        if not data:
            return [0] * periods
        
        smoothed = [data[0]]
        for i in range(1, len(data)):
            value = alpha * data[i] + (1 - alpha) * smoothed[-1]
            smoothed.append(value)
        
        # Forecast future periods
        forecast = []
        last_value = smoothed[-1]
        for _ in range(periods):
            forecast.append(last_value)
        
        return forecast
    
    @staticmethod
    def detect_seasonality(data: List[Dict[str, Any]], period: int = 7) -> Dict[str, Any]:
        """Detect seasonal patterns"""
        if len(data) < period * 2:
            return {"detected": False, "pattern": None}
        
        quantities = [d.get("quantity", 0) for d in data]
        
        # Calculate day-of-week patterns
        day_patterns = {}
        for i, item in enumerate(data):
            date = datetime.fromisoformat(item.get("date", datetime.now(timezone.utc).isoformat()))
            day_of_week = date.weekday()
            
            if day_of_week not in day_patterns:
                day_patterns[day_of_week] = []
            day_patterns[day_of_week].append(quantities[i])
        
        # Average by day
        avg_by_day = {day: statistics.mean(values) for day, values in day_patterns.items()}
        
        # Check variance
        all_values = list(avg_by_day.values())
        if len(all_values) > 1:
            variance = statistics.variance(all_values)
            mean_val = statistics.mean(all_values)
            cv = (variance ** 0.5) / mean_val if mean_val > 0 else 0
            
            if cv > 0.2:  # 20% coefficient of variation suggests seasonality
                return {
                    "detected": True,
                    "pattern": avg_by_day,
                    "coefficient_of_variation": cv
                }
        
        return {"detected": False, "pattern": None}
    
    @staticmethod
    def calculate_confidence_interval(data: List[float], forecast: float, confidence: float = 0.95) -> Dict[str, float]:
        """Calculate confidence interval for forecast"""
        if len(data) < 2:
            return {"lower": forecast * 0.8, "upper": forecast * 1.2}
        
        std_dev = statistics.stdev(data)
        mean_val = statistics.mean(data)
        
        # Z-score for 95% confidence
        z_score = 1.96 if confidence >= 0.95 else 1.645
        
        margin = z_score * std_dev
        
        return {
            "lower": max(0, forecast - margin),
            "upper": forecast + margin,
            "confidence_level": confidence
        }


forecasting_engine = ForecastingEngine()
