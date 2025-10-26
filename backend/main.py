import uvicorn
import socketio
import asyncio
import time
import httpx
import joblib
import pandas as pd
import os  # <-- NAYA: For environment variables
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv  # <-- NAYA: To load .env file
from twilio.rest import Client  # <-- NAYA: Twilio client

# --- 1. Load Environment Variables ---
load_dotenv()  # This loads the .env file

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
RECIPIENT_PHONE_NUMBER = os.getenv("RECIPIENT_PHONE_NUMBER")

# Check if Twilio config is valid
if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, RECIPIENT_PHONE_NUMBER]):
    print("⚠️ WARNING: Twilio credentials not fully set in .env file. SMS alerts will be disabled.")
    TWILIO_ENABLED = False
    twilio_client = None
else:
    print("✅ Twilio credentials loaded successfully. SMS alerts are active.")
    TWILIO_ENABLED = True
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# --- 2. AI Model Setup ---
class WeatherInput(BaseModel):
    temp: float
    humidity: float
    wind_speed: float

try:
    model = joblib.load('fire_model.joblib')
    print("✅ AI Model (fire_model.joblib) loaded successfully.")
except FileNotFoundError:
    print("❌ ERROR: 'fire_model.joblib' not found. Run 'python train.py'.")
    exit()
except Exception as e:
    print(f"❌ ERROR loading model: {e}")
    exit()

# --- 3. FastAPI and Socket.IO setup ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app_socket = socketio.ASGIApp(sio, other_asgi_app=app)


# --- 4. Weather API helper (Same as before) ---
DISTRICT_COORDINATES = {
    "Dehradun": [30.3165, 78.0322],
    "Haridwar": [29.9457, 78.1642],
    "Chamoli": [30.2935, 79.5603],
    "Rudraprayag": [30.2839, 78.9806],
    "Tehri Garhwal": [30.3800, 78.4300],
    "Uttarkashi": [30.7300, 78.4500],
    "Pauri Garhwal": [30.1500, 78.7700],
    "Almora": [29.5937, 79.6589],
    "Bageshwar": [29.8415, 79.7695],
    "Champawat": [29.3369, 80.0968],
    "Nainital": [29.3800, 79.4600],
    "Pithoragarh": [29.5800, 80.2200],
    "Udham Singh Nagar": [29.5300, 79.5000],
}

async def get_live_weather(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
        "timezone": "auto"
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            current = data['current']
            return {
                "temperature": current['temperature_2m'],
                "humidity": current['relative_humidity_2m'],
                "wind_speed": current['wind_speed_10m']
            }
    except Exception as e:
        print(f"Weather API error: {e}")
        return None

# --- 5. NAYA: Twilio Alert Function ---
def send_alert_message(district):
    if not TWILIO_ENABLED:
        print(f"SMS disabled. Would have sent alert for {district}.")
        return

    try:
        message_body = (
            f"🔥 *Agni-Rakshak ALERT* 🔥\n"
            f"High-risk forest fire predicted in: *{district}, Uttarakhand*.\n"
            f"Coordinates: {DISTRICT_COORDINATES.get(district, 'N/A')}\n"
            f"Deploying resources. Check dashboard immediately."
        )
        
        # This sends an SMS. 
        # To send WhatsApp, change 'from_' to 'from_': 'whatsapp:TWILIO_WHATSAPP_NUMBER'
        # and 'to' to 'to': 'whatsapp:RECIPIENT_PHONE_NUMBER'
        message = twilio_client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=RECIPIENT_PHONE_NUMBER
        )
        print(f"✅ SMS Alert sent successfully! SID: {message.sid}")
    except Exception as e:
        print(f"❌ ERROR sending SMS: {e}")


# --- 6. AI Prediction Endpoint (Same as before) ---
@app.post("/predict")
async def predict_fire_risk(input: WeatherInput):
    try:
        input_df = pd.DataFrame([{
            "temp": input.temp,
            "RH": input.humidity,
            "wind": input.wind_speed
        }])
        probability = model.predict_proba(input_df)[0][1]
        
        risk_level = "Low"
        if probability > 0.7:
            risk_level = "High"
        elif probability > 0.4:
            risk_level = "Medium"

        return {
            "probability": probability,
            "risk_level": risk_level,
            "model_input": input.dict()
        }
    except Exception as e:
        return {"error": str(e), "status": 500}


# --- 7. Simulation & Socket.IO Events ---
fire_simulation = {
    "active": False,
    "district": None,
    "radius": 0.0
}

@app.get("/")
def read_root():
    return {"Hello": "From the Agni-Rakshak API"}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def ai_alert(sid, data):
    global fire_simulation
    district = data.get("district", "Dehradun")
    print(f"🔥 Manual Fire Simulation triggered for {district} from {sid}")
    
    # --- NAYA: Send SMS only if it's a *new* fire ---
    if not fire_simulation["active"]:
        print("--- Starting new fire simulation! ---")
        fire_simulation["active"] = True
        fire_simulation["district"] = district
        fire_simulation["radius"] = 0.01
        
        # ===> TRIGGER THE SMS ALERT <===
        send_alert_message(district)
    
    # This part just updates the map, not part of the 'if'
    LATEST_HIGH_RISK_DISTRICT = district


# --- 8. Live Data Emitter (Same as before) ---
async def emit_live_risk_data():
    districts = list(DISTRICT_COORDINATES.keys())
    base_spread_rate = 0.005 

    while True:
        risk_data = {}
        
        for district in districts:
            risk_data[district] = {
                "risk_level": "Low", 
                "probability": 0.0,
                "radius": 0,
                "weather": None
            }

        if fire_simulation["active"] and fire_simulation["district"]:
            fire_district = fire_simulation["district"]
            lat, lon = DISTRICT_COORDINATES.get(fire_district, DISTRICT_COORDINATES["Dehradun"])
            weather = await get_live_weather(lat, lon)
            
            spread_rate_multiplier = 1.0 

            if weather:
                temp = weather["temperature"]
                humidity = weather["humidity"]
                wind = weather["wind_speed"]
                temp_factor = max(0.1, temp / 30.0)
                humidity_factor = max(0.1, (100.0 - humidity) / 70.0)
                wind_factor = 1.0 + (wind / 10.0)
                spread_rate_multiplier = temp_factor * humidity_factor * wind_factor
                risk_data[fire_district]["weather"] = weather
            
            dynamic_spread_rate = base_spread_rate * spread_rate_multiplier
            fire_simulation["radius"] += dynamic_spread_rate
            risk_data[fire_district]["risk_level"] = "High"
            risk_data[fire_district]["probability"] = 0.99
            risk_data[fire_district]["radius"] = fire_simulation["radius"]

        await sio.emit('risk_update', risk_data)
        await asyncio.sleep(3)


# --- 9. Startup and Main (Same as before) ---
@app.on_event("startup")
async def startup_event():
    print("🚀 Server started... starting background data task.")
    asyncio.create_task(emit_live_risk_data())

if __name__ == "__main__":
    print("Starting Agni-Rakshak server on http://127.0.0.1:8000")
    uvicorn.run(
        "main:app_socket", 
        host="127.0.0.1", 
        port=8000, 
        reload=True
    )