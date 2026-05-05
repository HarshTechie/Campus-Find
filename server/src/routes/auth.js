const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyIdToken } = require('../services/googleVerify');

// Single source of truth for the allowed sign-in domain.
// Override per-environment with ALLOWED_EMAIL_DOMAIN in .env if needed.
const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'chitkara.edu.in').toLowerCase();

router.post('/signin', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'idToken required' });

  const payload = await verifyIdToken(idToken);
  const email = (payload.email || '').toLowerCase();

  if (!email) {
    return res.status(400).json({ message: 'Invalid email from Google' });
  }

  // Domain-level authorization. Runs AFTER token verification (so we know
  // Google itself signed off on this email) and BEFORE any DB write (so a
  // rejected sign-in never persists a User row).
  if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
    return res.status(403).json({
      message: `Sign-in is restricted to @${ALLOWED_DOMAIN} accounts.`,
      code: 'DOMAIN_NOT_ALLOWED',
    });
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: payload.name || 'Unknown',
      email,
      avatar: payload.picture,
      oauthProvider: 'google',
      emailVerified: payload.email_verified || true
    });
  }

  const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

  res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
});

module.exports = router;
