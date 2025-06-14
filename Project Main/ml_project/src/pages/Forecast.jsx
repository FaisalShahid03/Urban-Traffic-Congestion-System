import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Forecast = () => {
  const [startCoords, setStartCoords] = useState([51.505, -0.09]);
  const [endCoords, setEndCoords] = useState([51.51, -0.1]);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const geocode = async (address) => {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: address, format: 'json', limit: 1 },
      });
      const result = res.data[0];
      return [parseFloat(result.lat), parseFloat(result.lon)];
    } catch {
      alert(`Failed to locate: ${address}`);
      return null;
    }
  };

  const handleAddressLookup = async () => {
    if (startAddress) {
      const coords = await geocode(startAddress);
      if (coords) setStartCoords(coords);
    }
    if (endAddress) {
      const coords = await geocode(endAddress);
      if (coords) setEndCoords(coords);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMapReady(false);

    await handleAddressLookup();

    const payload = {
      start_lat: startCoords[0],
      start_lng: startCoords[1],
      end_lat: endCoords[0],
      end_lng: endCoords[1],
      datetime: dateTime,
    };

    try {
      const res = await axios.post('http://localhost:5000/generate-map', payload);
      if (res.status === 200) {
        setMapReady(true);
      } else {
        alert('Map generation failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate map.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Traffic Congestion Prediction</h1>

      <div className="map-container">
        <MapContainer center={startCoords} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker
            position={startCoords}
            draggable={true}
            eventHandlers={{
              dragend: (e) => setStartCoords([e.target.getLatLng().lat, e.target.getLatLng().lng]),
            }}
          >
            <Popup>Start Location</Popup>
          </Marker>

          <Marker
            position={endCoords}
            draggable={true}
            eventHandlers={{
              dragend: (e) => setEndCoords([e.target.getLatLng().lat, e.target.getLatLng().lng]),
            }}
          >
            <Popup>Destination</Popup>
          </Marker>
        </MapContainer>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-group">
          <label>Start Address (optional):</label>
          <input
            type="text"
            value={startAddress}
            placeholder="e.g., Times Square, New York"
            onChange={(e) => setStartAddress(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Destination Address (optional):</label>
          <input
            type="text"
            value={endAddress}
            placeholder="e.g., Central Park, New York"
            onChange={(e) => setEndAddress(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Date & Time:</label>
          <input
            type="text"
            placeholder="Format: YYYY-MM-DD HH:MM"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Predict Traffic'}
        </button>
      </form>

      {mapReady && (
        <div style={{ marginTop: '20px' }}>
          <h3>Predicted Map:</h3>
          <iframe
            src="http://localhost:5000/map"
            title="Traffic Map"
            width="100%"
            height="500px"
            style={{ border: '1px solid #ccc', borderRadius: '8px' }}
          ></iframe>
        </div>
      )}

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .title {
          text-align: center;
          margin-bottom: 20px;
        }
        .map-container {
          height: 400px;
          margin-bottom: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
        }
        .input-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
        }
        label {
          font-weight: bold;
        }
        input {
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }
        button {
          padding: 12px;
          font-size: 16px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        button:disabled {
          background: #ccc;
        }
      `}</style>
    </div>
  );
};

export default Forecast;
