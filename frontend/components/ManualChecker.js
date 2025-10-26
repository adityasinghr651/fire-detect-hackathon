'use client';

import { useState } from 'react';

export default function ManualChecker() {
  // State for the form inputs
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [windSpeed, setWindSpeed] = useState('');

  // State for the API response
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          temp: parseFloat(temp),
          humidity: parseFloat(humidity),
          wind_speed: parseFloat(windSpeed),
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setPrediction(data); 

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* --- Manual Prediction Form --- */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="temp">
            Temperature (°C)
          </label>
          <input
            id="temp"
            type="number"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="e.g., 35"
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-white-900 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="humidity">
            Humidity (%)
          </label>
          <input
            id="humidity"
            type="number"
            value={humidity}
            onChange={(e) => setHumidity(e.target.value)}
            placeholder="e.g., 25"
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-white-900 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="wind">
            Wind Speed (km/h)
          </label>
          <input
            id="wind"
            type="number"
            value={windSpeed}
            onChange={(e) => setWindSpeed(e.target.value)}
            placeholder="e.g., 20"
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-white-900 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="flex items-center justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline disabled:bg-gray-500"
          >
            {isLoading ? 'Predicting...' : 'Predict Risk'}
          </button>
        </div>
      </form>

      {/* --- Result Display --- */}
      <div className="mt-6">
        <div className="bg-gray-700 p-4 rounded-lg h-full min-h-[100px] flex items-center justify-center">
          {error && (
            <div className="bg-red-800 border border-red-600 text-white px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {prediction && (
            <div className="text-center">
              <h3 className="text-lg font-bold mb-2">Prediction</h3>
              <p className={`text-3xl font-extrabold ${
                prediction.risk_level === 'High' ? 'text-red-500' :
                prediction.risk_level === 'Medium' ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                {prediction.risk_level}
              </p>
              <p className="text-md mt-1">
                Probability: {(prediction.probability * 100).toFixed(0)}%
              </p>
            </div>
          )}
          {!prediction && !error && !isLoading && (
            <p className="text-gray-400">Prediction displayed.</p>
          )}
        </div>
      </div>
    </div>
  );
}