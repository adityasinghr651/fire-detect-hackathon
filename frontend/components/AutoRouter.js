'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
// CSS is now in page.js, so we remove the import from here

// --- Custom Icons (Same as before) ---
const fireIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3061/3061320.png',
  iconSize: [35, 35],
});

const stationIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2833/2833444.png',
  iconSize: [35, 35],
});

const waterIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/601/601165.png',
  iconSize: [30, 30],
});
// ------------------------------------------

export default function AutoRouter({ routePlan }) {
  const map = useMap(); 

  useEffect(() => {
    if (!map || !routePlan) return;

    // These variables will hold our map layers
    let routingControl = null;
    let waterMarker = null;

    // 1. Add the "Water Source" marker
    waterMarker = L.marker(routePlan.water_source.location, { icon: waterIcon })
      .addTo(map)
      .bindPopup(routePlan.water_source.name);

    // 2. Create the routing control
    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(routePlan.station_location), // Start
        L.latLng(routePlan.fire_location)     // End
      ],
      routeWhileDragging: false,
      show: false, 
      addWaypoints: false, 
      
      // 3. Add our custom icons for Start and End
      createMarker: function (i, waypoint, n) {
        const icon = (i === 0) ? stationIcon : fireIcon;
        const title = (i === 0) ? "Fire Station" : "Fire Location";
        return L.marker(waypoint.latLng, {
          icon: icon,
          title: title
        }).bindPopup(title);
      }
    }).addTo(map);

    // 4. Cleanup function
    return () => {
      // --- THIS IS THE FIX ---
      // Only try to remove layers if the map still exists.
      if (map) {
        if (routingControl) {
          map.removeControl(routingControl);
        }
        if (waterMarker) {
          map.removeLayer(waterMarker);
        }
      }
      // -----------------------
    };

  }, [map, routePlan]); 

  return null; // This component doesn't render any visible HTML itself
}

