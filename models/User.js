const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true }
});

// Explicit index on username (no email field!)
userSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
