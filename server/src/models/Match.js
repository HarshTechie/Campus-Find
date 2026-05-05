const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const matchSchema = new Schema({
  lostRequestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
  foundRequestId: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
  score: { type: Number, default: 0 },
  status: { type: String, enum: ['open','cancelled','closed'], default: 'open' }, // added 'cancelled'
  lostConfirmed: { type: Boolean, default: false },   // lost side clicked "item received"
  foundConfirmed: { type: Boolean, default: false },  // found side clicked "item returned"
  closedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);
