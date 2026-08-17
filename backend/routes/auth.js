const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../utils/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_mvp';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    // Send email asynchronously
    sendWelcomeEmail(user.email, user.username);

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, profileImage: user.profileImage } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, profileImage: user.profileImage } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;
