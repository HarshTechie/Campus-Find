require('dotenv').config();

// Startup env check — logs presence (not the value) so blank/placeholder configs are caught early.
(function checkEnv() {
  const cid = process.env.GOOGLE_CLIENT_ID || ''
  const looksLikePlaceholder = cid.startsWith('PASTE_') || cid === ''
  const preview = cid ? cid.slice(0, 8) + '…' : '(empty)'
  console.log(`[env] GOOGLE_CLIENT_ID: ${preview} (len=${cid.length})${looksLikePlaceholder ? ' ⚠ PLACEHOLDER OR EMPTY' : ''}`)
  if (looksLikePlaceholder) {
    console.warn('[env] ⚠ GOOGLE_CLIENT_ID is missing or still a placeholder — Google sign-in will fail with 401 invalid_client.')
  }
  if (!process.env.JWT_SECRET) console.warn('[env] ⚠ JWT_SECRET is not set — auth tokens cannot be signed.')
  if (!process.env.MONGO_URI)  console.warn('[env] ⚠ MONGO_URI is not set — DB will not connect.')
})();

require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');

const authRoutes = require('./routes/auth');
const requestsRoutes = require('./routes/requests');
const matchesRoutes = require('./routes/matches');
const { socketHandler } = require('./sockets/socketHandler');
const socketEmitter = require('./services/socketEmitter');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*' }
});

// set up socket emitter for other modules to use
socketEmitter.setIo(io);

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// routes
app.use('/auth', authRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/matches', matchesRoutes);

app.get('/', (req, res) => res.send('Lost & Found API'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
    // start socket handler after server is listening
    socketHandler(io);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
