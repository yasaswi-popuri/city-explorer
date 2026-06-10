from flask import Flask, jsonify, request
import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta

app = Flask(__name__)

# Load dataset
df = pd.read_csv("climate.csv")
df['Date'] = pd.to_datetime(df['Date'], format='%d-%m-%Y')
df = df.sort_values('Date')
df = df.dropna(subset=['Temperature_Max (°C)', 'Temperature_Min (°C)', 'City'])

# Dictionary to store models for each city
city_models = {}

# Train models for each city
for city in df['City'].unique():
    city_data = df[df['City'] == city].copy()
    
    # Prepare Prophet models for this city
    max_data = city_data[['Date','Temperature_Max (°C)']].rename(columns={'Date':'ds','Temperature_Max (°C)':'y'})
    min_data = city_data[['Date','Temperature_Min (°C)']].rename(columns={'Date':'ds','Temperature_Min (°C)':'y'})
    
    # Skip cities with insufficient data
    if len(max_data) < 30:  # Need at least 30 data points
        continue
        
    max_model = Prophet(daily_seasonality=True)
    max_model.fit(max_data)
    
    min_model = Prophet(daily_seasonality=True)
    min_model.fit(min_data)
    
    city_models[city] = {
        'max_model': max_model,
        'min_model': min_model,
        'last_date': city_data['Date'].max()
    }

# Fallback model for cities without specific data
fallback_max_data = df[['Date','Temperature_Max (°C)']].rename(columns={'Date':'ds','Temperature_Max (°C)':'y'})
fallback_min_data = df[['Date','Temperature_Min (°C)']].rename(columns={'Date':'ds','Temperature_Min (°C)':'y'})

fallback_max_model = Prophet(daily_seasonality=True)
fallback_max_model.fit(fallback_max_data)

fallback_min_model = Prophet(daily_seasonality=True)
fallback_min_model.fit(fallback_min_data)

@app.route('/predict', methods=['GET'])
def predict():
    # Get parameters
    city = request.args.get('city', '').strip().capitalize()
    days = int(request.args.get('days', 1))  # Default to 1 day, max 7 days
    
    # Limit days to reasonable range
    days = min(max(days, 1), 7)
    
    # Choose model based on city availability
    if city and city in city_models:
        max_model = city_models[city]['max_model']
        min_model = city_models[city]['min_model']
        model_type = "city-specific"
    else:
        max_model = fallback_max_model
        min_model = fallback_min_model
        model_type = "regional average"
    
    # Generate predictions for previous day, today, and tomorrow
    current_date = datetime.now()
    yesterday = current_date - timedelta(days=1)
    tomorrow = current_date + timedelta(days=1)
    
    # Create date range: yesterday, today, tomorrow
    date_range = pd.date_range(start=yesterday, end=tomorrow, freq='D')
    
    # Create future dataframe with correct dates
    future_df = pd.DataFrame({'ds': date_range})
    
    forecast_max = max_model.predict(future_df)
    forecast_min = min_model.predict(future_df)
    
    # Get predictions for the requested days
    predictions = []
    
    for i in range(len(forecast_max)):
        max_pred = forecast_max.iloc[i]
        min_pred = forecast_min.iloc[i]
        
        pred_date = max_pred['ds']
        if isinstance(pred_date, pd.Timestamp):
            pred_date = pred_date.to_pydatetime()
        
        days_diff = (pred_date - current_date).days
        
        # Determine day label
        if days_diff == -1:
            day_label = "Yesterday"
        elif days_diff == 0:
            day_label = "Today"
        elif days_diff == 1:
            day_label = "Tomorrow"
        else:
            day_label = f"{days_diff:+d} days"
        
        predictions.append({
            "date": pred_date.strftime('%Y-%m-%d'),
            "readable_date": pred_date.strftime('%A, %B %d, %Y'),
            "day_label": day_label,
            "days_diff": int(days_diff),
            "max_temp": max_pred['yhat'],
            "min_temp": min_pred['yhat']
        })
    
    # Check for significant weather changes and add notifications
    notifications = []
    if len(predictions) >= 3:
        yesterday = predictions[0]
        today = predictions[1] 
        tomorrow = predictions[2]
        
        # Temperature change thresholds
        temp_change_threshold = 1.0  # 1 degree change (lowered for demonstration)
        
        # Check for significant temperature changes
        if abs(today["max_temp"] - yesterday["max_temp"]) >= temp_change_threshold:
            notifications.append({
                "type": "temperature_change",
                "message": f"Max temperature changed by {abs(today['max_temp'] - yesterday['max_temp']):.1f}°C",
                "severity": "warning" if abs(today['max_temp'] - yesterday['max_temp']) >= 5 else "info"
            })
        
        if abs(today["min_temp"] - yesterday["min_temp"]) >= temp_change_threshold:
            notifications.append({
                "type": "temperature_change", 
                "message": f"Min temperature changed by {abs(today['min_temp'] - yesterday['min_temp']):.1f}°C",
                "severity": "warning" if abs(today['min_temp'] - yesterday['min_temp']) >= 5 else "info"
            })
        
        # Check for tomorrow's significant changes
        if abs(tomorrow["max_temp"] - today["max_temp"]) >= temp_change_threshold:
            notifications.append({
                "type": "forecast_change",
                "message": f"Tomorrow's max temp will change by {abs(tomorrow['max_temp'] - today['max_temp']):.1f}°C",
                "severity": "warning" if abs(tomorrow['max_temp'] - today['max_temp']) >= 5 else "info"
            })
        
        # Check for extreme temperatures
        if today["max_temp"] > 35:
            notifications.append({
                "type": "extreme_heat",
                "message": f"Extreme heat warning: {today['max_temp']:.1f}°C",
                "severity": "danger"
            })
        
        if today["min_temp"] < 10:
            notifications.append({
                "type": "extreme_cold",
                "message": f"Cold weather alert: {today['min_temp']:.1f}°C",
                "severity": "warning"
            })

    response = {
        "city": city if city else "Unknown",
        "model_type": model_type,
        "predictions": predictions,
        "notifications": notifications
    }
    
    # Add location context
    if city:
        response["location_context"] = f"Weather prediction for {city} ({model_type})"
    else:
        response["location_context"] = f"Weather prediction ({model_type})"
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(port=5000)
