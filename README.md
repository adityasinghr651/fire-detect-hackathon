🚀 Agni-Rakshak AI: Global Fire Command Center
Agni-Rakshak AI is a real-time forest fire command and control system. It provides a high-level 3D global view for situational awareness and a detailed 2D operational dashboard for real-time risk assessment, resource deployment, and monitoring.

The system is built on a full-stack architecture, using Next.js for a dynamic frontend and a (presumed) Python/FastAPI backend for data processing and real-time communication via WebSockets.

🏗️ Project Flow & Architecture
The application is divided into two main parts: the 3D Globe (Homepage) and the 2D Dashboard (Operational View).

1. 📡 Data & Backend (Inferred)
Server: A backend server (e.g., FastAPI in Python) runs at http://127.0.0.1:8000.

Real-time Communication: The server uses socket.io to push data to all connected clients.

'risk_update' Event: The backend periodically emits a 'risk_update' event. This event sends a JSON object containing risk data for all 13 districts of Uttarakhand.

JSON

{
  "Dehradun": { "risk_level": "Low", ... },
  "Haridwar": { "risk_level": "Medium", ... },
  "Chamoli": { "risk_level": "High", ... }
}
'ai_alert' Event: The 2D dashboard can emit an 'ai_alert' event back to the server to trigger a simulation or action for a specific district.

2. 🖥️ Frontend (Next.js)
The frontend is built using the Next.js App Router.

🌎 Component: 3D Globe (app/page.js)
This is the application's main entry point.

Technology: react-three-fiber (for the 3D scene), @react-three/drei (for helpers like Stars, Html, OrbitControls), and three.js.

Flow:

On load, the page establishes a socket.io connection to the backend.

It listens for the 'risk_update' event.

The highRiskDistrict state is updated by finding the first district with risk_level === 'High'.

If highRiskDistrict is set, the <AlertMarker /> component is rendered on the globe.

The AlertMarker uses the latLonToVector3 helper to place an animated HTML marker at the correct coordinates on the 3D sphere.

Navigation:

If the user clicks the AlertMarker, the handleGlobeClick(district) function is called.

This function triggers router.push('/dashboard'), navigating the user to the 2D dashboard.

📊 Component: 2D Dashboard (app/dashboard/page.js)
This is the operational view for monitoring and action.

Technology: react-leaflet (for the 2D map), GeoJSON (for district boundaries), and dynamic import from next/dynamic (to prevent SSR issues with Leaflet).

Flow:

On load, this page also connects to the socket.io server and listens for the same 'risk_update' event.

The UI is split into several panels:

RiskMap (Main): A Leaflet map that loads uttarakhand.json GeoJSON data. The styleGeoJSON function colors each district based on the riskData received from the socket.

DroneFeed Panel: A component to show live video feeds.

ManualChecker Panel: A component with form elements to manually calculate or override risk.

AutoRouter (Inside RiskMap): A dynamically-loaded component to draw an emergency response route.

Interactivity:

Clicking a district in the "UTTARAKHAND DISTRICTS" list calls handleDistrictSelect.

This function emits an 'ai_alert' to the backend (to start a simulation) and sets the autoPlan state to draw a route on the map.

🛠️ Technology Stack & Dependencies
Here are all the technologies and packages required to run this project.

Frontend (package.json)
Core:

react

react-dom

next

3D Globe:

three

@react-three/fiber

@react-three/drei

2D Dashboard:

leaflet

react-leaflet

@types/leaflet (Recommended)

leaflet-routing-machine (Inferred for AutoRouter)

Communication:

socket.io-client

Styling:

tailwindcss

postcss, autoprefixer

Backend (Inferred requirements.txt)
fastapi

uvicorn

python-socketio

pandas, scikit-learn (Inferred for risk prediction)

🩺 Current Status & Debugging
This section outlines the problem we are currently solving.

Goal: Successfully navigate from the 3D Globe (app/page.js) to the 2D Dashboard (app/dashboard/page.js) when an AlertMarker is clicked.

The Problem: When an AlertMarker is clicked, the router.push('/dashboard') command runs, but the dashboard page does not render. The page either stays blank, shows the old page, or shows an error.

What We Have Confirmed:

Globe Page is Correct: The click handler logic (handleGlobeClick) on app/page.js is correct.

Navigation is Firing: The router.push('/dashboard') command is being executed.

File Path is Correct: The dashboard page exists at the correct path: app/dashboard/page.js.

Conclusion: The navigation itself is working. The app/dashboard/page.js file is crashing on load. This crash is happening before any of its own console.log statements can even run.

Root Cause: The crash is caused by an error in one of the components it imports:

../../components/DroneFeed

../../components/ManualChecker

../../components/RiskMap

Or, a component imported by RiskMap: ./AutoRouter

✅ Next Steps (The Solution)
The immediate next step is to isolate the broken component.

Go to app/dashboard/page.js.

Comment out the import statements and the JSX tags for DroneFeed, ManualChecker, and RiskMap.

Add a simple <h1>Dashboard Works!</h1> inside the <main> tag.

Test the navigation. The "Dashboard Works!" page should appear.

Uncomment the components one by one, starting with the simplest (ManualChecker).

When the page crashes again, the last component you uncommented is the one containing the error.

If RiskMap is the problem, repeat the process inside components/RiskMap.js by commenting out its import of AutoRouter.
