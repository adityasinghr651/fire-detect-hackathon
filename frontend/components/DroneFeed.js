'use client';

import { useEffect, useRef, useState } from 'react';

// --- NEW, MORE RELIABLE VIDEO SOURCE ---
const videoSrc = "https://cdn.pixabay.com/video/2019/02/10/22022-315181754_large.mp4";

// --- UPDATED FAKE DETECTIONS to match the new video ---
const detections = [
  { time: 3000, x: 600, y: 300, w: 100, h: 80, label: "THERMAL HOTSPOT" },
  { time: 10000, x: 400, y: 200, w: 150, h: 100, label: "SMOKE DETECTED" },
  { time: 20000, x: 100, y: 400, w: 120, h: 90, label: "HOTSPOT" },
];
// ---------------------------------------------------

export default function DroneFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // This is our animation loop
    const renderLoop = () => {
      // 1. Match canvas size to video size
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;

      // 2. Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 3. Check video time and show a "detection"
      const videoTime = video.currentTime * 1000; // in ms
      
      let activeDetection = null;
      for (const det of detections) {
        // Show detection for 3 seconds
        if (videoTime >= det.time && videoTime < det.time + 3000) {
          activeDetection = det;
          break;
        }
      }

      // 4. Draw the "AI" box if we have a detection
      if (activeDetection) {
        // Scale coordinates to the video's displayed size
        // (The video file is 1280x720, but we display it smaller)
        const scaleX = canvas.width / 1280;
        const scaleY = canvas.height / 720;

        const x = activeDetection.x * scaleX;
        const y = activeDetection.y * scaleY;
        const w = activeDetection.w * scaleX;
        const h = activeDetection.h * scaleY;
        
        // Draw the red box
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        // Draw the text label
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(activeDetection.label, x, y - 5);
      }
      
      // 5. Keep the loop going
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    // Start the animation when the video plays
    video.addEventListener('play', () => {
      animationFrameId = requestAnimationFrame(renderLoop);
    });
    
    // Attempt to start play immediately (for autoplay)
    video.play().catch(error => {
      // Autoplay was prevented. This is fine, user will click.
      console.log("Autoplay prevented:", error);
    });

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      {/* The Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline // Important for mobile
        className="w-full h-full object-cover"
      />
      {/* The Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
      />
      {/* The "LIVE" badge */}
      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-0.5 rounded text-sm font-bold">
        ● LIVE
      </div>
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-0.5 rounded text-sm">
        DRONE FEED: UK-DHR-01
      </div>
    </div>
  );
}
