const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const msgSchema = new Schema({
  matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: String,
  attachments: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatMessage', msgSchema);
