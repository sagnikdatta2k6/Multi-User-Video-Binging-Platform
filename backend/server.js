const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const sequelize = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded profile images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow all origins
    methods: ['GET', 'POST']
  }
});

// Simple in-memory store for rooms
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId, username, profileImage }) => {
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        playbackState: {
          videoId: null,
          isPlaying: false,
          timestamp: 0,
          updatedAt: Date.now()
        }
      });
    }

    const room = rooms.get(roomId);
    room.users.set(socket.id, { username, profileImage, socketId: socket.id });

    // Broadcast to others in the room
    socket.to(roomId).emit('user_joined', { username, profileImage, socketId: socket.id });
    
    // Send current state to the joining user
    socket.emit('room_state', {
      users: Array.from(room.users.values()),
      playbackState: room.playbackState
    });
  });

  socket.on('sync_playback', ({ roomId, state }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.playbackState = {
        ...room.playbackState,
        ...state,
        updatedAt: Date.now()
      };
      // Broadcast to everyone else in the room
      socket.to(roomId).emit('playback_synced', room.playbackState);
    }
  });

  socket.on('send_message', ({ roomId, message }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const user = room.users.get(socket.id);
      if (user) {
        const chatMessage = {
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          text: message,
          username: user.username,
          profileImage: user.profileImage,
          timestamp: Date.now()
        };
        // Broadcast to everyone in the room INCLUDING the sender
        io.to(roomId).emit('new_message', chatMessage);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find which room the user was in and remove them
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        const username = room.users.get(socket.id).username;
        room.users.delete(socket.id);
        socket.to(roomId).emit('user_left', { socketId: socket.id, username });
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

// Sync Database and start server
sequelize.sync().then(() => {
  console.log('Database synced');
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
