require('dotenv').config();
require('express-async-errors');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const requestsRoutes = require('./routes/requests');
const matchesRoutes = require('./routes/matches');
const { socketHandler } = require('./sockets/socketHandler');
const socketEmitter = require('./services/socketEmitter');

// Surface anything that would otherwise silently kill the process on Render.
process.on('unhandledRejection', (err) => console.error('UNHANDLED REJECTION:', err));
process.on('uncaughtException',  (err) => { console.error('UNCAUGHT EXCEPTION:', err); process.exit(1); });

(function checkEnv() {
  const required = ['MONGO_URI', 'JWT_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) console.warn('[env] Missing required vars:', missing.join(', '));
  if (!process.env.FRONTEND_URL)    console.warn('[env] FRONTEND_URL not set — CORS will reject the deployed client.');
  if (!process.env.GOOGLE_CLIENT_ID) console.warn('[env] GOOGLE_CLIENT_ID not set — Google sign-in will fail.');
})();

const app = express();
const server = http.createServer(app);

// FRONTEND_URL can be a single URL or a comma-separated list.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);                  // curl / server-to-server
    if (allowedOrigins.length === 0) return cb(null, true); // dev fallback
    return cb(null, allowedOrigins.includes(origin));
  },
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });
socketEmitter.setIo(io);

app.set('trust proxy', 1); // Render sits behind a proxy
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get('/',       (req, res) => res.send('Lost & Found API'));
app.get('/health', (req, res) => res.json({ ok: true, mongo: mongoose.connection.readyState }));

app.use('/auth',         authRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/matches',  matchesRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;

// 1) Bind to the port FIRST so Render's port scanner sees us immediately.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
  socketHandler(io);
});

// 2) Connect to Mongo in the background. App stays up; /health reports DB state.
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => mongoose.connection.close(false).finally(() => process.exit(0)));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
