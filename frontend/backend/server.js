const express = require('express');
const cors = require('cors');
const path = require('path');
const Pusher = require('pusher');
const sequelize = require('./db');
const User = require('./models/User');
const Room = require('./models/Room');
const bcrypt = require('bcryptjs');

// Define relationships
User.hasMany(Room, { foreignKey: 'hostId' });
Room.belongsTo(User, { foreignKey: 'hostId' });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded profile images statically (Note: on Vercel this only works locally or if stored externally)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));

// Room Endpoints
app.post('/api/room', async (req, res) => {
  try {
    try {
      await Room.sync({ alter: true }); // Ensure table exists and schema is updated
    } catch (e) {
      await Room.sync({ force: true }); // Recreate if type casting fails
    }
    const { roomId, password, hostId } = req.body;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    await Room.create({
      roomId,
      password: hashedPassword,
      hostId
    });
    
    res.json({ success: true, roomId });
  } catch (error) {
    console.error('Create room error', error);
    res.status(500).json({ error: 'Server error', details: error.message, stack: error.stack });
  }
});

app.post('/api/room/:roomId/verify', async (req, res) => {
  try {
    try {
      await Room.sync({ alter: true }); // Ensure table exists and schema is updated
    } catch (e) {
      await Room.sync({ force: true }); // Recreate if type casting fails
    }
    const { password } = req.body;
    const room = await Room.findByPk(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!room.password) {
      return res.json({ success: true }); // No password required
    }
    
    const isMatch = await bcrypt.compare(password, room.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Verify room error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/room/:roomId/password', async (req, res) => {
  try {
    try {
      await Room.sync({ alter: true });
    } catch (e) {
      await Room.sync({ force: true });
    }
    
    const { password } = req.body;
    const room = await Room.findByPk(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    room.password = hashedPassword;
    await room.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update room password error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/room/:roomId/knock', async (req, res) => {
  try {
    const { userId, username } = req.body;
    const { roomId } = req.params;
    
    await pusher.trigger(`presence-room-${roomId}`, 'guest-knock', {
      userId,
      username
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Knock error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/room/:roomId/allow', async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const { roomId } = req.params;
    
    await pusher.trigger(`knock-${roomId}-${targetUserId}`, 'knock-allowed', {});
    
    res.json({ success: true });
  } catch (error) {
    console.error('Allow knock error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/room/:roomId', async (req, res) => {
  try {
    try {
      await Room.sync({ alter: true }); // Ensure table exists and schema is updated
    } catch (e) {
      await Room.sync({ force: true }); // Recreate if type casting fails
    }
    const room = await Room.findByPk(req.params.roomId, {
      attributes: ['roomId', 'hostId', 'password']
    });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      roomId: room.roomId,
      hostId: room.hostId,
      hasPassword: !!room.password
    });
  } catch (error) {
    console.error('Get room error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Pusher Setup
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true
});

// Pusher Authentication Endpoint for Private and Presence Channels
app.post('/api/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  
  let authResponse;
  
  if (channel.startsWith('presence-')) {
    // For presence channels, extract user data sent by frontend
    const presenceData = {
      user_id: req.body.user_id || socketId, // fallback to socketId if user_id missing
      user_info: {
        username: req.body.username || 'Anonymous',
        profileImage: req.body.profileImage || null
      }
    };
    authResponse = pusher.authorizeChannel(socketId, channel, presenceData);
  } else {
    authResponse = pusher.authorizeChannel(socketId, channel);
  }
  
  res.send(authResponse);
});

// Server-side Trigger Endpoint to bypass finicky Client Events
app.post('/api/pusher/trigger', async (req, res) => {
  const { channel, event, data } = req.body;
  try {
    await pusher.trigger(channel, event, data);
    res.json({ success: true });
  } catch (error) {
    console.error('Pusher trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger event' });
  }
});

// Sync Database on cold start (Creates Neon tables if they don't exist)
sequelize.sync().then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});

// Support for local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Global Error Handler for Vercel Serverless reliability
app.use((err, req, res, next) => {
  console.error('Unhandled Express Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
