import uvicorn
import socketio
import asyncio
import random
import time
import httpx  # <-- NAYA IMPORT
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- (FastAPI aur Socket.IO setup wahi hai) ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app_socket = socketio.ASGIApp(sio, other_asgi_app=app)

# --- NAYA: Weather API ke liye helper ---
# Dehradun ke coordinates (API call ke liye)
DISTRICT_COORDINATES = {
    "Dehradun": [30.3165, 78.0322],
    # Hum baaki bhi add kar sakte hain, abhi demo ke liye ek kaafi hai
}

async def get_live_weather(lat, lon):
    """
    Open-Meteo API se live weather data fetch karta hai.
    """
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
            response.raise_for_status() # Agar 4xx/5xx error ho toh fail kare
            data = response.json()
            
            # API se data nikaal kar return karna
            current = data['current']
            return {
                "temperature": current['temperature_2m'],
                "humidity": current['relative_humidity_2m'],
                "wind_speed": current['wind_speed_10m']
            }
    except Exception as e:
        print(f"Weather API error: {e}")
        return None

# --- Simulation state (wahi hai) ---
fire_simulation = {
    "active": False,
    "district": None,
    "start_time": 0,
    "radius": 0.0
}
LATEST_HIGH_RISK_DISTRICT = None

# --- (API endpoint wahi hai) ---
@app.get("/")
def read_root():
    return {"Hello": "World"}

# --- (Socket.IO event listeners wahi hain) ---
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def ai_alert(sid, data):
    global LATEST_HIGH_RISK_DISTRICT, fire_simulation
    district = data.get("district", "Dehradun")
    print(f"🔥 AI Alert received for {district} from {sid}")
    
    # Agar aag pehle se active nahi hai, toh nayi shuru karo
    if not fire_simulation["active"]:
        print("--- Starting new fire simulation! ---")
        fire_simulation["active"] = True
        fire_simulation["district"] = district
        fire_simulation["start_time"] = time.time()
        fire_simulation["radius"] = 0.01 # Initial chhota radius
    
    # Live data task ko update karo
    LATEST_HIGH_RISK_DISTRICT = district

# --- (Live Data Emitter - POORA BADAL GAYA) ---
async def emit_live_risk_data():
    """
    Background mein chalta hai aur real-time weather ke hisaab se
    fire spread simulate karke data push karta hai.
    """
    districts = [
        "Dehradun", "Haridwar", "Chamoli", "Rudraprayag", "Tehri Garhwal",
        "Uttarkashi", "Pauri Garhwal", "Almora", "Bageshwar", "Champawat",
        "Nainital", "Pithoragarh", "Udham Singh Nagar"
    ]
    
    base_spread_rate = 0.005 # Kitni tezi se aag badhegi (base)

    while True:
        risk_data = {}
        current_high_risk = LATEST_HIGH_RISK_DISTRICT

        # 1. Pehle sab districts ko 'Low' risk par set karo
        for district in districts:
            risk_data[district] = {
                "risk_level": "Low", 
                "probability": 0.1,
                "radius": 0,
                "weather": None # Naya field
            }

        # 2. Agar aag active hai, toh simulation chalao
        if fire_simulation["active"] and fire_simulation["district"]:
            fire_district = fire_simulation["district"]
            
            # 3. Live weather data fetch karo
            lat, lon = DISTRICT_COORDINATES.get(fire_district, [30.3165, 78.0322])
            weather = await get_live_weather(lat, lon)
            
            spread_rate_multiplier = 1.0 # Default speed

            if weather:
                # 4. NAYA "Fire Weather Index" FORMULA
                temp = weather["temperature"]
                humidity = weather["humidity"]
                wind = weather["wind_speed"]

                # Formula:
                # temp_factor: 30C par 1x, 40C par 1.33x
                temp_factor = max(0.1, temp / 30.0)
                # humidity_factor: 30% par 1x, 80% par 0.28x
                humidity_factor = max(0.1, (100.0 - humidity) / 70.0)
                # wind_factor: 10km/h par 1x, 30km/h par 3x
                wind_factor = 1.0 + (wind / 10.0)

                # Total speed = temp * nami * hawa
                spread_rate_multiplier = temp_factor * humidity_factor * wind_factor
                
                # Weather data ko frontend par bhejo
                risk_data[fire_district]["weather"] = weather
            
            # 5. Radius ko naye rate ke hisaab se badhao
            dynamic_spread_rate = base_spread_rate * spread_rate_multiplier
            fire_simulation["radius"] += dynamic_spread_rate
            
            # 6. High risk data set karo
            risk_data[fire_district]["risk_level"] = "High"
            risk_data[fire_district]["probability"] = 0.99
            risk_data[fire_district]["radius"] = fire_simulation["radius"]

        # 7. Sabko data push karo
        await sio.emit('risk_update', risk_data)
        
        # 3 second ruko
        await asyncio.sleep(3)

# --- (Startup aur Main function wahi hai) ---
@app.on_event("startup")
async def startup_event():
    print("Server started... starting background data task.")
    asyncio.create_task(emit_live_risk_data())

if __name__ == "__main__":
    print("Starting server on http://127.0.0.1:8000")
    uvicorn.run(app_socket, host="127.0.0.1", port=8000)

