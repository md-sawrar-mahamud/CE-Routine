const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  regNo: { type: String, unique: true, required: true, trim: true },
  fullName: String,
  session: String,
  batch: String,
  isUsed: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AllowedStudent', schema);