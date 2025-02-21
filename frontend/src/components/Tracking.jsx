import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import axios from 'axios';
import polyline from 'polyline';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LiveLocationMap = () => {
  const [roomId, setRoomId] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [endLat, setEndLat] = useState('');
  const [endLng, setEndLng] = useState('');
  const [route, setRoute] = useState([]);
  const [creatorLocation, setCreatorLocation] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('roomData', (data) => {
      setRoute(data.route);
      setCreatorLocation(data.creatorLocation);
    });

    newSocket.on('locationUpdate', (data) => {
      setCreatorLocation(data.location);
    });

    return () => newSocket.disconnect();
  }, []);

  const calculateRoute = async (startCoords, endCoords) => {
    try {
      const response = await axios.post('http://localhost:5000/api/directions', {
        coordinates: [
          [startCoords.lng, startCoords.lat],
          [endCoords.lng, endCoords.lat],
        ],
      });

      const data = response.data;
      if (data.routes && data.routes.length > 0) {
        const encodedPolyline = data.routes[0].geometry;
        const decodedPolyline = polyline.decode(encodedPolyline);
        return decodedPolyline.map((coord) => [coord[0], coord[1]]);
      } else {
        alert('No route found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      alert('Failed to fetch route');
      return null;
    }
  };

  const createRoom = async () => {
    if (!roomId) {
      alert('Please enter a Room ID');
      return;
    }

    setIsCreator(true);
  };

  const startNavigation = async () => {
    const startCoords = { lat: parseFloat(startLat), lng: parseFloat(startLng) };
    const endCoords = { lat: parseFloat(endLat), lng: parseFloat(endLng) };

    if (isNaN(startCoords.lat) || isNaN(startCoords.lng) || isNaN(endCoords.lat) || isNaN(endCoords.lng)) {
      alert('Please enter valid coordinates');
      return;
    }

    const routeCoords = await calculateRoute(startCoords, endCoords);
    if (routeCoords) {
      setRoute(routeCoords);
      if (socket) {
        socket.emit('createRoom', { roomId, route: routeCoords, creatorLocation });
      }
    }
  };

  const joinRoom = () => {
    if (socket && roomId) {
      socket.emit('joinRoom', roomId);
    } else {
      alert('Please enter a Room ID');
    }
  };

  useEffect(() => {
    if (!isCreator || !navigator.geolocation) return;

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCreatorLocation({ lat: latitude, lng: longitude });
          if (socket) {
            socket.emit('updateLocation', { roomId, location: { lat: latitude, lng: longitude } });
          }
        },
        (err) => {
          console.error('Error getting location:', err);
        },
        { enableHighAccuracy: true }
      );
    };

    updateLocation();
    const interval = setInterval(updateLocation, 5000);

    return () => clearInterval(interval);
  }, [socket, roomId, isCreator]);

  return (
    <div className="flex flex-col h-screen">
      <h1 className="text-3xl font-bold text-center py-4 bg-blue-600 text-white shadow-lg">
        Live Location Tracking
      </h1>

      {/* Control Panel */}
      <div className="p-6 bg-white shadow-md rounded-xl m-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {!isCreator ? (
          <div className="flex gap-4 col-span-full justify-center">
            <button
              onClick={createRoom}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg shadow-md transition"
            >
              Create Room
            </button>
            <button
              onClick={joinRoom}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md transition"
            >
              Join Room
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Start Latitude"
              value={startLat}
              onChange={(e) => setStartLat(e.target.value)}
              className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Start Longitude"
              value={startLng}
              onChange={(e) => setStartLng(e.target.value)}
              className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="End Latitude"
              value={endLat}
              onChange={(e) => setEndLat(e.target.value)}
              className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="End Longitude"
              value={endLng}
              onChange={(e) => setEndLng(e.target.value)}
              className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={startNavigation}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg shadow-md transition col-span-full"
            >
              Start Navigation
            </button>
          </>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-grow">
        <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-full w-full rounded-lg shadow-md">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {route.length > 0 && <Polyline positions={route} color="blue" />}
          {creatorLocation && (
            <Marker position={[creatorLocation.lat, creatorLocation.lng]}>
              <Popup>Creator's Live Location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LiveLocationMap;
