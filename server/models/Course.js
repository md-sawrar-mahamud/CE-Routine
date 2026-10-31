const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  credit: { type: Number, default: 3 },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  batch: String
}, { timestamps: true });

module.exports = mongoose.model('Course', schema);