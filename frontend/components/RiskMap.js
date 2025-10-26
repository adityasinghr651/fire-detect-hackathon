'use client'; 

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import dynamic from 'next/dynamic';
import uttarakhandData from '../app/data/uttarakhand.json';

// Dynamically import AutoRouter
const AutoRouter = dynamic(
  () => import('./AutoRouter'), 
  { ssr: false } // Disable server-side rendering
);

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

  if (typeof window === 'undefined') {
    return null; // Don't render on the server
  }

  return (
    <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
      
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      <GeoJSON 
        key={JSON.stringify(riskData)} // Force re-render when riskData changes
        data={uttarakhandData.features}
        style={styleGeoJSON}
      />

      {/* This renders the route and the 3 clickable icons */}
      {autoPlan && <AutoRouter routePlan={autoPlan} />}
      
    </MapContainer>
  );
}