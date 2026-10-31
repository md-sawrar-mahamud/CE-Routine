const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  routineSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoutineSlot' },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['scheduled','confirmed','cancelled','postponed','rescheduled'],
    default: 'scheduled'
  },
  actualStartTime: String,
  actualEndTime: String,
  actualRoom: String,
  note: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: Date,
  digestSent: { type: Boolean, default: false },
  isManuallyAdded: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ClassInstance', schema);