const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  passwordHash: String,
  role: { type: String, enum: ['admin','moderator','teacher','student'], default: 'student' },
  regNo: String,
  session: String,
  batch: String,
  designation: String,
  phone: String,
  photoUrl: String,
  isVerified: { type: Boolean, default: false },
  mustChangePassword: { type: Boolean, default: false },
  resetTokenHash: String,
  resetTokenExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);