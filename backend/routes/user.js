const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_mvp';

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) return res.status(401).json({ error: 'Not authorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token failed' });
  }
};

// Multer storage setup for profile images
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// GET /api/user/me
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

// PUT /api/user/settings
router.put('/settings', protect, upload.single('profileImage'), async (req, res) => {
  try {
    const { username } = req.body;
    
    if (username) {
      req.user.username = username;
    }
    
    if (req.file) {
      // Save the relative path so the frontend can request it via static serving
      req.user.profileImage = `/uploads/${req.file.filename}`;
    }
    
    await req.user.save();
    res.json(req.user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
