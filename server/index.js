// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors({ origin: 'https://live-tracking-n3syte67g-veda19gs-projects.vercel.app/' || '*' }));
app.use(express.json()); // Parse JSON request bodies
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://live-tracking-xi.vercel.app/' || '*',
    methods: ['GET', 'POST']
  },
});

app.post('/api/directions', async (req, res) => {
    const { coordinates } = req.body;
  
    try {
      const response = await axios.post(
        'https://api.openrouteservice.org/v2/directions/driving-car',
        { coordinates },
        {
          headers: {
            Authorization: process.env.API_KEY, // Replace with your API key
            'Content-Type': 'application/json',
          },
        }
      );
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching route:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch route' });
    }
  });
  
  // Existing Socket.IO code remains unchanged...
  

  const rooms = {};

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
  
    // Listen for room creation
    socket.on('createRoom', (data) => {
      const { roomId, route } = data;
      socket.join(roomId); // Join the room
      rooms[roomId] = { route, liveLocation: null, creator: socket.id }; // Store the route and creator
      console.log(`User ${socket.id} created and joined room ${roomId}`);
  
      // Broadcast the route to all users in the room
      io.to(roomId).emit('roomData', { route });
    });
  
    // Listen for room joining
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId); // Join the room
      console.log(`User ${socket.id} joined room ${roomId}`);
  
      // Send the existing room data (route and creator's live location) to the new user
      if (rooms[roomId]) {
        socket.emit('roomData', {
          route: rooms[roomId].route,
          liveLocation: rooms[roomId].liveLocation, // Only User A's location
        });
      }
    });
  
    // Listen for location updates (Only from Room Creator)
    socket.on('updateLocation', (data) => {
      const { roomId, location } = data;
      if (rooms[roomId] && rooms[roomId].creator === socket.id) { 
        // Only update location if the sender is the room creator
        rooms[roomId].liveLocation = location;
        io.to(roomId).emit('locationUpdate', { location }); // Broadcast only User A's location
      }
    });
  
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });
  });
const port=5000;
  
server.listen(port, () => {
  console.log('Socket.IO server is running on port 5000');
});
