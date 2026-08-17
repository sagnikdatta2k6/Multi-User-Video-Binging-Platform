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

// Pusher Authentication Endpoint for Private Channels (Client Events)
app.post('/api/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  
  // In a real app, you would verify the user's JWT token here
  // before granting access to the private channel.
  // For simplicity, we authorize any logged-in user who calls this.
  const authResponse = pusher.authorizeChannel(socketId, channel);
  res.send(authResponse);
});

// Sync Database locally if not on Vercel
if (process.env.NODE_ENV !== 'production') {
  sequelize.sync().then(() => {
    console.log('Database synced');
  }).catch(err => {
    console.error('Unable to connect to the database:', err);
  });
}

// Support for local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
