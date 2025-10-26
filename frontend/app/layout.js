import './globals.css';
// --- 1. ADD THIS LINE ---
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'Agni-Rakshak Dashboard', // You can change this
  description: 'AI-Powered Forest Fire Detection',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* --- 2. ADD THIS LINE --- */}
      <head>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" 
        />
      </head>
      
      <body>{children}</body>
    </html>
  );
}