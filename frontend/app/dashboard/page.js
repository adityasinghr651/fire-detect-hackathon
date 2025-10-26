'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import io from 'socket.io-client';

// Import your components
import DroneFeed from '../../components/DroneFeed';
import ManualChecker from '../../components/ManualChecker';

// Dynamically import RiskMap to prevent SSR issues with Leaflet
// We update the path because we are now one level deeper (in /dashboard)
const RiskMap = dynamic(
  () => import('../../components/RiskMap'), 
  { ssr: false }
);

// --- 1. Setup Socket.IO connection ---
const socket = io('http://127.0.0.1:8000');

export default function DashboardPage() { // Renamed component
  // State for the entire dashboard
  const [riskData, setRiskData] = useState(null);
  const [highRiskAlert, setHighRiskAlert] = useState(null);
  const [autoPlan, setAutoPlan] = useState(null);

  // --- 2. Connect to WebSocket on component mount ---
  useEffect(() => {
    console.log('Connecting to WebSocket...');

    socket.on('connect', () => {
      console.log('✅ WebSocket Connected:', socket.id);
    });

    // Listen for the 'risk_update' event from your FastAPI server
    socket.on('risk_update', (data) => {
      setRiskData(data); // Update the map colors
      
      // Find the first district with "High" risk
      const highRiskDistrict = Object.keys(data).find(
        (district) => data[district].risk_level === 'High'
      );

      if (highRiskDistrict) {
        setHighRiskAlert(highRiskDistrict); // Show the alert box
      } else {
        setHighRiskAlert(null); // Hide alert box if no high risk
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket Disconnected');
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // --- 3. Handle clicking on a district ---
  const handleDistrictSelect = (districtName) => {
    console.log(`District selected: ${districtName}`);
    
    // This is the "drill-down" feature you wanted.
    // We will create a mock "autoPlan" for the AutoRouter component.
    
    // In a real app, you'd fetch this from an API
    const MOCK_RESOURCES = {
      fire_location: [30.3165, 78.0322], // Dehradun Coords
      station_location: [30.3398, 78.0483], // Mock Fire Station
      water_source: {
        name: "Asan Barrage (Water Source)",
        location: [30.4128, 77.6833]
      }
    };
    
    // Set the plan, which will be passed to RiskMap -> AutoRouter
    setAutoPlan(MOCK_RESOURCES);

    // This is the *other* part of your idea:
    // When you click a district, we *trigger* the fire simulation in the backend
    console.log(`🔥 Emitting 'ai_alert' to start simulation in ${districtName}`);
    socket.emit('ai_alert', { district: districtName });
  };

  // Helper to format the district list
  const getDistricts = () => {
    if (!riskData) {
      return Array(13).fill({ name: 'Loading...', level: 'Low' });
    }
    return Object.keys(riskData).map((district) => ({
      name: district,
      level: riskData[district].risk_level,
    }));
  };

  return (
    <main className="relative h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* --- 4. Main Map (Dynamically Loaded) --- */}
      <div className="absolute inset-0">
        <RiskMap 
          riskData={riskData} 
          autoPlan={autoPlan} // Pass the route plan to the map
        />
      </div>

      {/* --- 5. High Risk Alert (Top-Left) --- */}
      {highRiskAlert && (
        <div className="absolute top-4 left-4 z-[1000] p-4 bg-red-600 border-2 border-red-300 rounded-lg shadow-2xl animate-pulse">
          <h2 className="text-2xl font-bold">HIGH RISK ALERT</h2>
          <p className="text-xl">{highRiskAlert}</p>
        </div>
      )}

      {/* --- 6. Scrolling District List (Bottom-Left) --- */}
      <div className="absolute bottom-4 left-4 z-[1000] w-64 h-48 p-2 bg-black bg-opacity-70 border border-gray-600 rounded-lg shadow-lg">
        <h3 className="font-bold text-center mb-1">UTTARAKHAND DISTRICTS</h3>
        <div className="h-full overflow-y-auto pr-2">
          {getDistricts().map((d, i) => (
            <div
              key={i}
              onClick={() => d.name !== 'Loading...' && handleDistrictSelect(d.name)}
              className={`flex justify-between items-center p-1 rounded cursor-pointer ${
                d.level === 'High' ? 'bg-red-700' : 'hover:bg-gray-700'
              }`}
            >
              <span>{d.name}</span>
              <span className={`font-bold ${
                d.level === 'High' ? 'text-white' :
                d.level === 'Medium' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {d.level}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* --- 7. Right-hand Info Panel --- */}
      <div className="absolute top-4 right-4 z-[1000] w-96 h-[calc(100vh-2rem)] flex flex-col gap-4">
        
        {/* Drone Feed Panel */}
        <div className="flex-1 min-h-0 bg-black border-2 border-gray-600 rounded-lg shadow-2xl overflow-hidden">
          <DroneFeed />
        </div>

        {/* Manual Check Panel */}
        <div className="flex-shrink-0 p-4 bg-gray-800 bg-opacity-80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl">
          <h2 className="text-xl font-bold text-center mb-3">
            Manual Risk Assessment
          </h2>
          <ManualChecker />
        </div>
      </div>

      {/* --- Leaflet CSS Fix --- */}
      <style jsx global>{`
        .leaflet-container {
          background: #374151; /* gray-700 */
        }
        .leaflet-routing-container {
          display: none; /* Hide the default white route summary box */
        }
      `}</style>
    </main>
  );
}