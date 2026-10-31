const express = require('express');
const router = express.Router();
const RoutineSlot = require('../models/RoutineSlot');
const ClassInstance = require('../models/ClassInstance');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');
const { auth, requireRole } = require('../middleware/auth');

const DAY_MAP = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
function dateToDay(dateStr) {
  return DAY_MAP[new Date(dateStr).getDay()];
}
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Find other RoutineSlots in the same room with an overlapping time that could
// land on the same calendar day (same weekday for recurring, same exact date for one-time)
async function findSlotConflicts({ day, oneTimeDate, isOneTime, roomNo, startTime, endTime, excludeId }) {
  if (!roomNo || !startTime || !endTime) return [];
  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);

  const all = await RoutineSlot.find({ _id: { $ne: excludeId }, roomNo: { $exists: true, $ne: '' } })
    .populate('courseId teacherId');

  return all.filter(s => {
    const sRoom = (s.roomNo || '').trim().toLowerCase();
    if (sRoom !== roomNo.trim().toLowerCase()) return false;

    let coincides = false;
    if (!isOneTime && !s.isOneTime) {
      coincides = s.day === day;
    } else if (isOneTime && s.isOneTime) {
      coincides = s.oneTimeDate && new Date(s.oneTimeDate).toDateString() === new Date(oneTimeDate).toDateString();
    } else if (isOneTime && !s.isOneTime) {
      coincides = s.day === dateToDay(oneTimeDate);
    } else if (!isOneTime && s.isOneTime) {
      coincides = dateToDay(s.oneTimeDate) === day;
    }
    if (!coincides) return false;

    const sStart = toMinutes(s.startTime);
    const sEnd = toMinutes(s.endTime);
    if (sStart === null || sEnd === null) return false;
    return newStart < sEnd && sStart < newEnd;
  });
}

async function notifyStudentsNewSlot(slot) {
  const populated = await slot.populate('courseId teacherId');
  const students = await User.find({ role: 'student', batch: slot.batch });
  if (students.length === 0) return;

  const when = slot.isOneTime
    ? new Date(slot.oneTimeDate).toDateString()
    : `every ${slot.day}`;
  const message = `📅 NEW CLASS ADDED: ${populated.courseId?.code} (${populated.courseId?.name}) on ${when}, ${slot.startTime}-${slot.endTime} in Room ${slot.roomNo || 'TBA'}.`;

  await Notification.insertMany(students.map(s => ({ userId: s._id, message, type: 'urgent' })));

  for (const s of students) {
    sendMail({
      to: s.email,
      subject: '📅 New Class Added to Routine',
      html: `<div style="font-family:Arial"><h3>New Class Scheduled</h3><p>${message}</p></div>`
    });
  }
}

router.get('/', auth, async (req, res) => {
  const { batch } = req.query;
  let filter = {};
  if (req.user.role === 'moderator') {
    filter.batch = req.user.batch;
  } else if (req.user.role === 'teacher') {
    filter.teacherId = req.user.id;
  } else if (batch) {
    filter.batch = batch;
  }
  const slots = await RoutineSlot.find(filter).populate('courseId teacherId');
  res.json(slots);
});

router.post('/', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.user.role === 'moderator') {
      body.batch = req.user.batch; // force moderator's own batch, ignore client value
    }
    if (!body.batch) return res.status(400).json({ error: 'Batch is required' });

    const isOneTime = !!body.isOneTime;
    if (isOneTime) {
      if (!body.oneTimeDate) return res.status(400).json({ error: 'Date is required for a one-time class' });
      body.day = dateToDay(body.oneTimeDate);
      if (!['SUN','MON','TUE','WED','THU'].includes(body.day)) {
        return res.status(400).json({ error: 'One-time class date must fall on SUN–THU' });
      }
    } else {
      body.isOneTime = false;
      delete body.oneTimeDate;
    }

    const { notifyNow, force } = body;
    delete body.notifyNow;
    delete body.force;

    if (body.roomNo) {
      const conflicts = await findSlotConflicts({
        day: body.day, oneTimeDate: body.oneTimeDate, isOneTime,
        roomNo: body.roomNo, startTime: body.startTime, endTime: body.endTime,
        excludeId: null
      });
      if (conflicts.length > 0 && !force) {
        return res.status(409).json({
          error: 'Room/time conflict detected with another slot',
          conflicts: conflicts.map(c => ({
            course: c.courseId?.code,
            teacher: c.teacherId?.fullName,
            room: c.roomNo,
            when: c.isOneTime ? new Date(c.oneTimeDate).toDateString() : c.day,
            startTime: c.startTime,
            endTime: c.endTime
          }))
        });
      }
    }

    const slot = await RoutineSlot.create(body);

    // One-time slots: create the matching ClassInstance right away so it
    // shows up immediately, independent of any nightly generator job.
    if (isOneTime) {
      const cutoff = new Date(); cutoff.setHours(23, 30, 0, 0);
      const isLate = new Date() > cutoff;
      await ClassInstance.create({
        routineSlotId: slot._id,
        date: body.oneTimeDate,
        actualStartTime: body.startTime,
        actualEndTime: body.endTime,
        actualRoom: body.roomNo,
        status: 'confirmed',
        isManuallyAdded: true,
        updatedBy: req.user.id,
        digestSent: isLate || !!notifyNow
      });
    }

    if (notifyNow) {
      await notifyStudentsNewSlot(slot);
    }

    res.json({ success: true, slot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const existing = await RoutineSlot.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Slot not found' });
    if (req.user.role === 'moderator' && existing.batch !== req.user.batch) {
      return res.status(403).json({ error: 'You can only edit slots in your assigned batch' });
    }
    const body = { ...req.body };
    if (req.user.role === 'moderator') {
      body.batch = req.user.batch;
    }
    const slot = await RoutineSlot.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json({ success: true, slot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const existing = await RoutineSlot.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Slot not found' });
    if (req.user.role === 'moderator' && existing.batch !== req.user.batch) {
      return res.status(403).json({ error: 'You can only delete slots in your assigned batch' });
    }
    await RoutineSlot.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;