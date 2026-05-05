const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Match = require('../models/Match');
const Request = require('../models/Request');
const User = require('../models/User');
const { sendMail } = require('../services/email');
const ChatMessage = require('../models/ChatMessage');
const socketEmitter = require('../services/socketEmitter');

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await Match.findById(matchId).lean();
    if (!match) return res.status(404).json({ message: 'Match not found' });

    if (match.status !== 'open') {
      return res.status(403).json({ message: 'Match is not active' });
    }

    const requesterId = req.user.id;
    const lostReq = await Request.findById(match.lostRequestId).select('owner').lean();
    const foundReq = await Request.findById(match.foundRequestId).select('owner').lean();

    const isParticipant =
      (lostReq && lostReq.owner && lostReq.owner.toString() === requesterId) ||
      (foundReq && foundReq.owner && foundReq.owner.toString() === requesterId);

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view messages for this match' });
    }

    const messages = await ChatMessage.find({ matchId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email')
      .lean();

    return res.json({ messages });
  } catch (err) {
    console.error('GET match messages error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate({ path: 'lostRequestId', select: 'owner title category locationText status' })
      .populate({ path: 'foundRequestId', select: 'owner title category locationText status' })
      .lean();
    if (!match) return res.status(404).json({ message: 'Match not found' });
    res.json(match);
  } catch (err) {
    console.error('GET match err', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const matchId = req.params.id;

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    const [lostReq, foundReq] = await Promise.all([
      Request.findById(match.lostRequestId).select('owner status'),
      Request.findById(match.foundRequestId).select('owner status')
    ]);

    if (!lostReq || !foundReq) return res.status(400).json({ message: 'Related requests not found' });

    let updated = false;

    if (lostReq.owner.toString() === userId) {
      if (!match.lostConfirmed) {
        match.lostConfirmed = true;
        updated = true;
      }
    }

    if (foundReq.owner.toString() === userId) {
      if (!match.foundConfirmed) {
        match.foundConfirmed = true;
        updated = true;
      }
    }

    if (!updated) {
      return res.status(403).json({ message: 'User not authorized to confirm this match or already confirmed.' });
    }

    if (match.lostConfirmed && match.foundConfirmed) {
      match.status = 'closed';
      match.closedAt = new Date();

      // mark both requests resolved
      await Promise.all([
        Request.findByIdAndUpdate(match.lostRequestId, { $set: { status: 'resolved' } }),
        Request.findByIdAndUpdate(match.foundRequestId, { $set: { status: 'resolved' } })
      ]);

      // cancel all other open/verified matches that involve either request
      const otherMatches = await Match.find({
        _id: { $ne: match._id },
        status: { $in: ['open', 'verified'] },
        $or: [
          { lostRequestId: match.lostRequestId },
          { foundRequestId: match.lostRequestId },
          { lostRequestId: match.foundRequestId },
          { foundRequestId: match.foundRequestId }
        ]
      }).lean();

      for (const om of otherMatches) {
        try {
          await Match.findByIdAndUpdate(om._id, { $set: { status: 'cancelled' } });

          // remove sub-doc entry from related Request.matches arrays
          await Request.findByIdAndUpdate(om.lostRequestId, { $pull: { matches: { matchedRequestId: om.foundRequestId } } });
          await Request.findByIdAndUpdate(om.foundRequestId, { $pull: { matches: { matchedRequestId: om.lostRequestId } } });

          // emit cancelled for clients
          socketEmitter.emit('match:cancelled', {
            matchId: om._id.toString(),
            lostRequestId: om.lostRequestId.toString(),
            foundRequestId: om.foundRequestId.toString()
          });
        } catch (e) {
          console.error('Error cancelling other match', om._id, e);
        }
      }

      // send closure emails (best effort)
      try {
        const [lostOwner, foundOwner] = await Promise.all([
          User.findById(lostReq.owner).select('email name'),
          User.findById(foundReq.owner).select('email name')
        ]);
        if (lostOwner && foundOwner) {
          await sendMail(lostOwner.email, 'Match resolved — item received', `Your match has been confirmed and closed.`, `<p>Your match with <b>${foundOwner.name}</b> has been confirmed and closed.</p>`);
          await sendMail(foundOwner.email, 'Match resolved — item returned', `Your match has been confirmed and closed.`, `<p>Your match with <b>${lostOwner.name}</b> has been confirmed and closed.</p>`);
        }
      } catch (emailErr) {
        console.error('Error sending closure emails', emailErr);
      }
    }

    await match.save();

    // broadcast update
    socketEmitter.emit('match:updated', {
      matchId: match._id.toString(),
      status: match.status,
      lostConfirmed: match.lostConfirmed,
      foundConfirmed: match.foundConfirmed,
      closedAt: match.closedAt || null
    });

    if (match.status === 'closed') {
      socketEmitter.emit('match:closed', {
        matchId: match._id.toString(),
        lostRequestId: match.lostRequestId.toString(),
        foundRequestId: match.foundRequestId.toString(),
        closedAt: match.closedAt
      });
    }

    return res.json({ match });
  } catch (err) {
    console.error('confirm match err', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/resolved/all', auth, async (req, res) => {
  try {
    const matches = await Match.find({ status: 'closed' })
      .sort({ closedAt: -1 })
      .limit(200)
      .populate({ path: 'lostRequestId foundRequestId', select: 'title locationText category owner createdAt' })
      .lean();

    for (const m of matches) {
      if (m.lostRequestId && m.lostRequestId.owner) {
        m.lostRequestId.owner = await User.findById(m.lostRequestId.owner).select('name email').lean();
      }
      if (m.foundRequestId && m.foundRequestId.owner) {
        m.foundRequestId.owner = await User.findById(m.foundRequestId.owner).select('name email').lean();
      }
    }

    res.json({ matches });
  } catch (err) {
    console.error('fetch resolved matches err', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
