'use client'; 

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import dynamic from 'next/dynamic'; // <-- 1. IMPORT DYNAMIC
import uttarakhandData from '../app/data/uttarakhand.json';

// --- 2. DYNAMICALLY IMPORT AUTOROUTER ---
// This prevents map loading race conditions
const AutoRouter = dynamic(
  () => import('./AutoRouter'), 
  { ssr: false } // Disable server-side rendering for this component
);
// ------------------------------------------

const mapCenter = [30.0668, 79.0193];
const mapZoom = 8;

function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case 'High':
      return '#FF0000'; // Red
    case 'Medium':
      return '#FFA500'; // Orange
    case 'Low':
      return '#008000'; // Green
    default:
      return '#808080'; // Gray
  }
}

// We receive the new 'autoPlan' prop here
export default function RiskMap({ riskData, autoPlan }) {
  
  const styleGeoJSON = (feature) => {
    const districtName = feature.properties.DISTRICT;
    const districtRisk = riskData ? riskData[districtName] : null;
    
    return {
      fillColor: districtRisk ? getRiskColor(districtRisk.risk_level) : '#808080',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };

  // --- 3. I've REMOVED the 'onEachFeature' function ---
  // This is what created the "No data available" popups.
  // By removing it, the colored districts are no longer clickable.

  if (typeof window === 'undefined') {
    return null; // Don't render on the server
  }

  return (
    // --- 4. Set height to 100% to fill the parent container ---
    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
      
      {/* --- 5. Use a cleaner, modern map style --- */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      <GeoJSON 
        key={JSON.stringify(riskData)} // Force re-render when riskData changes
        data={uttarakhandData.features} // <-- USE .features FOR STABILITY
        style={styleGeoJSON}
        // --- 6. 'onEachFeature' prop is now removed ---
      />

      {/* This renders the route and the 3 clickable icons (fire, station, water) */}
      {autoPlan && <AutoRouter routePlan={autoPlan} />}
      
    </MapContainer>
  );
}

