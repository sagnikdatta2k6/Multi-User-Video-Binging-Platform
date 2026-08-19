const express = require('express');
const cors = require('cors');
const path = require('path');
const Pusher = require('pusher');
const sequelize = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded profile images statically (Note: on Vercel this only works locally or if stored externally)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));

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
