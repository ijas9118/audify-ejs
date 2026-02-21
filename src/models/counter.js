const mongoose = require('mongoose');

/**
 * Counter model for auto-incrementing sequential IDs.
 * Uses MongoDB's findOneAndUpdate with upsert to atomically
 * increment counters, making it safe under concurrent requests.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'order'
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically fetch and increment a named counter.
 * @param {string} name - Counter name (e.g., 'order')
 * @returns {Promise<number>} The new sequence value
 */
Counter.getNextSequence = async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = Counter;
