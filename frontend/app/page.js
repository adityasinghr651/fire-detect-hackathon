'use client';

// react-three-fiber se zaroori hooks import kiye
import { Canvas, useFrame, useThree } from '@react-three/fiber';
// drei se textures, controls, aur stars ke liye helpers
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
// THREE.js ki core library, vector/math ke liye zaroori
import * as THREE from 'three';

// --- HELPER FUNCTIONS (CDN se script load karne ke liye) ---

// Utility function to load a single script
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    // Check if script is already present
    if (document.querySelector(`script[src="${src}"]`)) {
      console.log(`Script already loaded: ${src}`);
      return resolve();
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log(`Script loaded successfully: ${src}`);
      resolve();
    };
    script.onerror = () => {
      console.error(`Failed to load script: ${src}`);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.body.appendChild(script);
  });
};

// Function to load all AI scripts in order
const loadAiScripts = async () => {
  // Check if already loaded
  if (window.cocoSsd) {
    console.log("AI scripts (cocoSsd) already loaded.");
    return;
  }
  try {
    // 1. Load the MAIN TensorFlow.js umbrella package first.
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js');
    
    // 2. Ab COCO-SSD model load karo.
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
    
    console.log("All AI scripts loaded from CDN.");

  } catch (error) {
    console.error("Failed to load AI scripts:", error);
  }
};


// --- (DroneFeed component) ---
function DroneFeed({ onObjectDetected, districtToAlert }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [model, setModel] = useState(null);

  // 1. Model load karo
  useEffect(() => {
    async function loadModel() {
      console.log("Loading AI scripts from CDN...");
      setIsLoading(true);
      try {
        await loadAiScripts();
        
        if (window.tf) {
          await window.tf.setBackend('webgl');
          console.log("TensorFlow backend set to WebGL.");
        } else {
          console.error("tf (TensorFlow) object not found on window!");
          setIsLoading(false);
          return;
        }

        if (window.cocoSsd) {
          console.log("🚀 Loading COCO-SSD model...");
          const loadedModel = await window.cocoSsd.load();
          setModel(loadedModel);
          console.log("✅ COCO-SSD model loaded successfully.");
        } else {
          console.error("cocoSsd object not found on window!");
        }
        setIsLoading(false);

      } catch (err) {
        console.error("Failed to load model", err);
        setIsLoading(false);
      }
    }
    loadModel();
  }, []);

  // 2. Webcam start karo
  useEffect(() => {
    async function setupWebcam() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', () => {
              console.log("Webcam feed started.");
              if (model) {
                runDetectionLoop();
              }
            });
          }
        } catch (err) {
          console.error("Failed to get webcam", err);
        }
      }
    }
    if (model) {
      setupWebcam();
    }
  }, [model]);

  // 3. Detection loop
  const runDetectionLoop = async () => {
    if (!videoRef.current || !canvasRef.current || !model) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const predictions = await model.detect(video);
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#00FFFF';
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;

    let personDetected = false;

    predictions.forEach(prediction => {
      ctx.beginPath();
      ctx.rect(prediction.bbox[0], prediction.bbox[1], prediction.bbox[2], prediction.bbox[3]);
      ctx.stroke();
      
      ctx.fillText(
        `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
        prediction.bbox[0],
        prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
      );

      if (prediction.class === 'person') {
        personDetected = true;
      }
    });

    if (personDetected) {
      onObjectDetected(districtToAlert);
    }

    requestAnimationFrame(runDetectionLoop);
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 w-64 border-2 border-cyan-500 rounded-lg shadow-lg bg-black/50 backdrop-blur-sm overflow-hidden">
      <p className="text-center text-sm p-1 bg-black/80">
        {isLoading ? 'Loading AI Model...' : 'LIVE DRONE FEED (AI Active)'}
      </p>
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  );
}
// --- (DroneFeed component yahaan khatm) ---


// --- DISTRICT COORDINATES (WAHI HAI) ---
const DISTRICT_COORDINATES = {
  "Dehradun": [30.3165, 78.0322], "Haridwar": [29.9457, 78.1642],
  "Chamoli": [30.2935, 79.5603], "Rudraprayag": [30.2838, 78.9806],
  "Tehri Garhwal": [30.3804, 78.4736], "Uttarkashi": [30.7352, 78.4357],
  "Pauri Garhwal": [30.1499, 78.7753], "Almora": [29.5937, 79.6603],
  "Bageshwar": [29.8436, 79.7719], "Champawat": [29.3364, 80.0924],
  "Nainital": [29.3803, 79.4636], "Pithoragarh": [29.5828, 80.2199],
  "Udham Singh Nagar": [29.0278, 79.4136]
};
const GLOBE_RADIUS = 2;

// --- (latLonToVector3 function wahi hai) ---
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// --- REAL GLOBE COMPONENT (UPDATED) ---
function Earth() {
  const earthRef = useRef();
  // const cloudsRef = useRef(); // Hata diya

  // Sirf zameen ki texture load karo
  const [earthMap] = useTexture([
    'https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg'
    // Cloud texture URL hata diya
  ]);

  // Globe ko ghumaao
  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    if (earthRef.current) {
      earthRef.current.rotation.y = elapsedTime / 15;
    }
    // Cloud ka rotation logic hata diya
  });

  return (
    <>
      {/* Yeh hai zameen (Land) */}
      <mesh ref={earthRef} scale={[1, 1, 1]}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial map={earthMap} />
      </mesh>
      
      {/* Cloud mesh (baadal) poora hata diya */}
    </>
  );
}


// --- NAYA FIRE EFFECT COMPONENT (REGION WALA) ---
function FireEffect({ position, radius }) {
  const coreMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xff6a00,
    emissive: 0xff0000,
    emissiveIntensity: 2,
    toneMapped: false
  }), []);

  const regionMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xff2200,
    transparent: true,
    opacity: 0.25
  }), []);

  return (
    <group position={position}>
      {/* 1. Fireball (Core) */}
      <mesh material={coreMaterial}>
        <sphereGeometry args={[radius * 0.8, 16, 16]} />
      </mesh>
      {/* 2. Heat Region (Affected Area) */}
      <mesh material={regionMaterial}>
        <sphereGeometry args={[radius * 1.3, 16, 16]} />
      </mesh>
    </group>
  );
}


// --- MAIN COMPONENT (Bina CameraManager ke) ---
export default function Home() {
  const [liveData, setLiveData] = useState(null);
  const [highRiskDistrict, setHighRiskDistrict] = useState("Connecting...");
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [aiAlertCooldown, setAiAlertCooldown] = useState(false);
  
  // Camera logic hata diya gaya hai


  useEffect(() => {
    const newSocket = io('http://127.0.0.1:8000', {
      transports: ['websocket']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    
    newSocket.on('risk_update', (data) => {
      setLiveData(data);
      
      const highRisk = Object.keys(data).find(key => data[key].risk_level === 'High');
      setHighRiskDistrict(highRisk || "None");
      
      // Camera logic hata diya gaya hai
    });
    
    newSocket.on('connect_error', () => {
      setIsConnected(false);
      setHighRiskDistrict("Connection Failed");
    });
    
    return () => newSocket.disconnect();
  }, []);

  // AI Alert handler (wahi hai)
  const handleAiAlert = (district) => {
    if (socket && !aiAlertCooldown) {
      console.log(`AI Alert! Detected person in ${district}. Sending to backend.`);
      socket.emit('ai_alert', { district: district });
      setAiAlertCooldown(true);
      setTimeout(() => setAiAlertCooldown(false), 10000);
    }
  };

  return (
    <main className="w-full h-screen bg-black text-white font-sans">
      
      {/* 2D HUD (wahi hai) */}
      <div className="absolute top-0 left-0 z-10 p-4 md:p-6 w-full">
        <div className="bg-black/60 backdrop-blur-sm p-4 rounded-lg border border-blue-500/30 shadow-lg max-w-sm">
          <h1 className="text-2xl font-bold text-cyan-300">Project Agni-Rakshak</h1>
          <p className="text-sm text-gray-300">3D Real-time Forest Fire Intel</p>
          <div className="mt-4">
            <p>
              Status: 
              <span className={isConnected ? "text-green-400" : "text-red-500"}>
                {isConnected ? " ● CONNECTED" : " ● DISCONNECTED"}
              </span>
            </p>
            <p className="text-lg mt-2">
              High Risk Alert: 
              <span className="text-red-500 font-bold animate-pulse ml-2">
                {highRiskDistrict}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Drone Feed (wahi hai) */}
      <DroneFeed 
        onObjectDetected={handleAiAlert}
        districtToAlert="Dehradun" 
      />

      {/* 3D Canvas (UPDATED) */}
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} className="w-full h-full">
        <ambientLight intensity={0.5} color="white" />
        <pointLight position={[10, 10, 10]} intensity={2} color="white" />

        <Suspense fallback={null}>
          <Earth />

          {/* Fire Effect Logic (wahi hai) */}
          {liveData && Object.entries(liveData).map(([district, data]) => {
            if (data.risk_level === 'High' && data.radius > 0 && DISTRICT_COORDINATES[district]) {
              const [lat, lon] = DISTRICT_COORDINATES[district];
              const position = latLonToVector3(lat, lon, GLOBE_RADIUS); 
              
              return (
                <FireEffect
                  key={district} 
                  position={position} 
                  radius={data.radius} 
                />
              );
            }
            return null;
          })}
        </Suspense>
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* OrbitControls (UPDATED) */}
        <OrbitControls 
          enableZoom={true} 
          enablePan={true}
          autoRotate={true} // Auto-rotate chalu hai
          autoRotateSpeed={0.5} 
          minDistance={2.5}
          maxDistance={15} 
        />
        
        {/* Camera Controller poori tarah hata diya gaya hai */}
        
      </Canvas>
    </main>
  );
}

