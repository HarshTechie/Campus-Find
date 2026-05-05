const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const matchSub = new Schema({
  matchedRequestId: { type: Schema.Types.ObjectId, ref: 'Request' },
  matchId: { type: Schema.Types.ObjectId, ref: 'Match' }, // new field
  score: Number,
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const reqSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['lost','found'], required: true },
  category: String,
  title: String,
  description: String,
  locationText: String,
  tags: [String],
  images: [String],
  status: { type: String, enum: ['open','matched','closed','resolved'], default: 'open' },
  matches: [matchSub],
  createdAt: { type: Date, default: Date.now }
});

reqSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Request', reqSchema);
