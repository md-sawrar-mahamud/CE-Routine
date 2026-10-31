const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  day: { type: String, enum: ['SUN','MON','TUE','WED','THU'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roomNo: String,
  batch: { type: String, required: true },
  isOneTime: { type: Boolean, default: false },
  oneTimeDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('RoutineSlot', schema);