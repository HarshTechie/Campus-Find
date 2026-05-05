const jwt = require('jsonwebtoken');
const ChatMessage = require('../models/ChatMessage');
const Match = require('../models/Match');
const User = require('../models/User');

function socketHandler(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Auth error'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Auth error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('socket connected', socket.user?.email || socket.id);

    socket.on('join', async ({ matchId }) => {
      try {
        if (!matchId) return socket.emit('error', { message: 'missing matchId' });

        const m = await Match.findById(matchId).lean();
        if (!m) {
          socket.emit('error', { message: 'match not found' });
          return;
        }

        // only allow joining active/open matches
        if (m.status !== 'open') {
          socket.emit('error', { message: 'This match is not active (closed/cancelled)' });
          return;
        }

        const room = `match:${matchId}`;
        socket.join(room);
        console.log(`socket ${socket.user?.email || socket.id} joined room ${room}`);
        socket.emit('joined', { matchId });
      } catch (err) {
        console.error('join error', err);
        socket.emit('error', { message: 'join failed' });
      }
    });

    socket.on('message:send', async ({ matchId, text }) => {
      try {
        if (!matchId || !text) {
          socket.emit('error', { message: 'invalid message payload' });
          return;
        }

        // ensure match is still open before saving message
        const m = await Match.findById(matchId).select('status').lean();
        if (!m || m.status !== 'open') {
          socket.emit('error', { message: 'Cannot send message: match is not active' });
          return;
        }

        const created = await ChatMessage.create({ matchId, sender: socket.user.id, text });

        const populated = await ChatMessage.findById(created._id).populate('sender', 'name email').lean();

        console.log('socket: saved message ->', { matchId, msgId: populated._id, sender: populated.sender?.email });

        io.to(`match:${matchId}`).emit('message:new', { msg: populated });
      } catch (err) {
        console.error('socket message:send error', err);
        socket.emit('error', { message: 'server error' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('socket disconnected', socket.user?.email || socket.id, 'reason:', reason);
    });
  });
}

module.exports = { socketHandler };
