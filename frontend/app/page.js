'use client';
import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import io from 'socket.io-client';

// --- 1. WebSocket Connection ---
const socket = io('http://127.0.0.1:8000');

// --- 2. District Coordinates (Copied from backend) ---
const DISTRICT_COORDINATES = {
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
};

// --- 3. Helper to convert Lat/Lon to 3D position ---
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

// --- 4. 3D Alert Marker Component ---
function AlertMarker({ district, onClick }) {
    const [lat, lon] = DISTRICT_COORDINATES[district] || [30.3165, 78.0322];
    const position = latLonToVector3(lat, lon, 2.05);

    return (
        <Html position={position}>
            <div 
                className="cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(district);
                }}
            >
                <div className="relative flex items-center justify-center">
                    <div className="absolute w-6 h-6 bg-red-500 rounded-full animate-ping opacity-75"></div>
                    <div className="relative w-3 h-3 bg-red-600 rounded-full border-2 border-white"></div>
                </div>
                <span className="relative -left-1/2 mt-1 text-sm font-bold text-white bg-black bg-opacity-50 px-2 py-0.5 rounded">
                    {district}
                </span>
            </div>
        </Html>
    );
}

// --- 5. The Main 3D Globe Component ---
function Globe({ highRiskDistrict, onGlobeClick }) {
  const globeRef = useRef();

  // 1. Load the earth texture
  const colorMap = useLoader(
    THREE.TextureLoader,
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/141228/earthmap1k.jpg'
  );

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <>
      <mesh ref={globeRef} onClick={() => onGlobeClick(null)}>
        <sphereGeometry args={[2, 64, 64]} />
        {/* 2. Apply the loaded texture to the 'map' prop */}
        <meshStandardMaterial map={colorMap} />
      </mesh>
      {highRiskDistrict && (
        <AlertMarker
          district={highRiskDistrict}
          onClick={onGlobeClick}
        />
      )}
    </>
  );
}


// --- 6. The Main Page Component ---
export default function GlobePage() {
    const router = useRouter();
    const [highRiskDistrict, setHighRiskDistrict] = useState(null);
    const [statusText, setStatusText] = useState("Connecting...");

    useEffect(() => {
        socket.on('connect', () => {
            console.log('✅ WebSocket Connected:', socket.id);
            setStatusText("Scanning for threats...");
        });

        socket.on('risk_update', (data) => {
            const highRisk = Object.keys(data).find(
                (d) => data[d].risk_level === 'High'
            );
            
            if (highRisk) {
                setHighRiskDistrict(highRisk);
                setStatusText(`ALERT: High Risk in ${highRisk}`);
            } else {
                setHighRiskDistrict(null);
                setStatusText("All districts clear. Scanning...");
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ WebSocket Disconnected');
            setStatusText("Connection lost. Reconnecting...");
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleGlobeClick = (district) => {
        if (district) {
            console.log(`Alert marker for ${district} clicked. Navigating to dashboard...`);
            router.push('/dashboard');
        } else {
            console.log("Globe clicked, not navigating.");
        }
    };

    return (
        <main className="relative h-screen w-screen bg-black text-white">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1.5} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
                
                <Suspense fallback={null}>
                    <Globe 
                        highRiskDistrict={highRiskDistrict}
                        onGlobeClick={handleGlobeClick}
                    />
                </Suspense>
                
                <OrbitControls 
                    enableZoom={true} 
                    minDistance={2.5} 
                    maxDistance={10}
                    enablePan={false}
                    autoRotate={true}
                    autoRotateSpeed={0.3}
                />
            </Canvas>
            
            <div className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none">
                <h1 className="text-3xl font-bold text-white tracking-widest uppercase">
                    Agni-Rakshak AI
                </h1>
                <p className="text-lg text-gray-300">Global Forest Fire Command Center</p>
            </div>
            
            <div className="absolute bottom-0 left-0 w-full p-4 z-10 pointer-events-none">
                <div className="max-w-md">
                    <div className={`p-3 rounded-lg ${highRiskDistrict ? 'bg-red-600' : 'bg-green-600'} bg-opacity-90`}>
                        <p className="font-bold text-lg">
                            {highRiskDistrict ? `ALERT: ${highRiskDistrict}` : "STATUS: NORMAL"}
                        </p>
                        <p className="text-base text-gray-200">
                            {highRiskDistrict ? "High probability of fire detected. Click marker to deploy." : "All zones clear. Actively monitoring."}
                        </p>
                        <p className="text-sm text-gray-400">
                            Click the globe or alert marker to view 2D dashboard.
                        </p>
                    </div>
                </div>
            </div>

            {highRiskDistrict && (
                <div className="absolute top-4 right-4 z-10 p-4 bg-red-600 border-2 border-red-300 rounded-lg shadow-2xl animate-pulse">
                    <h2 className="text-2xl font-bold">HIGH RISK ALERT</h2>
                    <p className="text-xl">{highRiskDistrict}</p>
                </div>
            )}
        </main>
    );
}
