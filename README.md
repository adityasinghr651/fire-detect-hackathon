<h1 align="center">🔥 Project Agni-Rakshak 🔥</h1>
<p align="center">
<b>A 3D Real-Time Predictive Fire Intelligence Dashboard</b>
</p>
<p align="center">
<i>Move over 2D maps. This is a "J.A.R.V.I.S." style 3D digital twin that visualizes AI insights and live weather data in real-time.</i>
</p>

<p align="center">

</p>

🚀 Core Features

3D Digital Twin Globe: A fully interactive, real-texture 3D globe built with react-three-fiber.

Live AI Drone Feed: Uses TensorFlow.js to analyze a live webcam feed (simulating a drone) in the browser. It detects 'persons' (a common cause of fires) in real-time to trigger alerts.

Predictive Fire Spread Simulation: The fire spread isn't static. The backend predicts the fire's growth rate (radius growth) based on live weather data.

Real-Time Weather Intel: The backend fetches live Temperature, Humidity, and Wind Speed from the Open-Meteo API to power the simulation directly.

Instant Data Pipeline: A high-speed, real-time data connection between the FastAPI (Python) backend and the Next.js (React) frontend using Socket.IO.

⚙️ How It Works (The Data Flow)

The system operates in a continuous loop:

AI Detection (Frontend): The DroneFeed component (webcam) detects a 'person'.

Alert Trigger (Frontend -> Backend): The frontend sends an ai_alert WebSocket event to the backend.

Simulation Start (Backend): The backend sets the fire simulation to active, marks the district, and records the start_time.

Live Intel (Backend): The backend calls the Open-Meteo API to fetch live weather data (Temp, Humidity, Wind) for that district.

Prediction (Backend): Using a "Fire Weather Index" formula, the backend calculates how fast the fire will spread (dynamic_spread_rate).

Data Push (Backend -> Frontend): The backend pushes the new radius and live weatherData to all connected clients via a risk_update event.

Visualization (Frontend):

The FireEffect component on the 3D globe grows according to the new radius.

The "Live Intel" section in the 2D HUD updates with the live weather data.

🛠️ Tech Stack

This project is built with a modern, real-time technology stack.

Frontend

Backend

🖥️ Setup & Installation Guide

Follow these steps to run the project on your system.

Prerequisites

Node.js (v18.x or newer)

Python (v3.7 or newer)

Git

1. Clone the Project

git clone [https://github.com/YourUsername/Your-Repo-Name.git](https://github.com/YourUsername/Your-Repo-Name.git)
cd Your-Repo-Name


(Use your own GitHub URL)

2. Backend Setup (Terminal 1)

Open your first terminal and navigate into the backend folder.

# 1. Navigate into the backend folder
cd backend

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate the environment
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 4. Install the required packages (from requirements.txt)
pip install -r requirements.txt

# 5. Run the backend server
python main.py


✅ Your backend is now running at http://127.0.0.1:8000. Leave this terminal running.

3. Frontend Setup (Terminal 2)

Open a new terminal and navigate into the frontend folder from the project root.

# 1. Navigate into the frontend folder
cd frontend

# 2. Install the Node modules
npm install

# 3. Run the frontend app
npm run dev


✅ Your frontend is now running at http://localhost:3000.

4. Access the Project

Open your browser and go to http://localhost:3000.

You should see the 3D globe and the HUD status should show "● CONNECTED".

The browser will ask for webcam permission. Allow it.

Come in front of the webcam feed (bottom-right). The AI will detect a 'person', trigger an alert, and the fire spread simulation will begin on the globe!
