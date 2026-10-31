const express = require('express');
const router = express.Router();
const ClassInstance = require('../models/ClassInstance');
const RoutineSlot = require('../models/RoutineSlot');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');
const { auth, requireRole } = require('../middleware/auth');

async function notifyStudentsUrgent(instance, action) {
  const slot = await RoutineSlot.findById(instance.routineSlotId).populate('courseId teacherId');
  if (!slot) return;
  const students = await User.find({ role: 'student', batch: slot.batch });

  const message = `⚠️ URGENT UPDATE: ${slot.courseId.code} (${slot.courseId.name}) on ${new Date(instance.date).toDateString()} has been ${action}. ${instance.note ? 'Note: ' + instance.note : ''}`;

  const notifDocs = students.map(s => ({ userId: s._id, message, type: 'urgent' }));
  await Notification.insertMany(notifDocs);

  for (const s of students) {
    sendMail({
      to: s.email,
      subject: '⚠️ Urgent Class Schedule Update',
      html: `<div style="font-family:Arial"><h3>Last-Minute Schedule Change</h3><p>${message}</p></div>`
    });
  }
}

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Find other active classes (not cancelled/postponed) in the same room,
// on the same date, with an overlapping time range — excluding one instance by id.
async function findRoomConflicts({ date, room, startTime, endTime, excludeId }) {
  if (!room || !startTime || !endTime) return [];
  const dayStart = new Date(new Date(date).setHours(0, 0, 0, 0));
  const dayEnd = new Date(new Date(date).setHours(23, 59, 59, 999));

  const candidates = await ClassInstance.find({
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: ['cancelled', 'postponed'] },
    _id: { $ne: excludeId }
  }).populate({ path: 'routineSlotId', populate: ['courseId', 'teacherId'] });

  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);

  return candidates.filter(c => {
    const cRoom = c.actualRoom || c.routineSlotId?.roomNo;
    if (!cRoom || cRoom.trim().toLowerCase() !== room.trim().toLowerCase()) return false;
    const cStart = toMinutes(c.actualStartTime || c.routineSlotId?.startTime);
    const cEnd = toMinutes(c.actualEndTime || c.routineSlotId?.endTime);
    if (cStart === null || cEnd === null) return false;
    return newStart < cEnd && cStart < newEnd; // overlap
  });
}

function formatConflicts(conflicts) {
  return conflicts.map(c => ({
    id: c._id,
    course: c.routineSlotId?.courseId?.code,
    teacher: c.routineSlotId?.teacherId?.fullName,
    room: c.actualRoom || c.routineSlotId?.roomNo,
    startTime: c.actualStartTime || c.routineSlotId?.startTime,
    endTime: c.actualEndTime || c.routineSlotId?.endTime,
    status: c.status
  }));
}

// --- Virtual instance support ---------------------------------------------
// Tomorrow's view used to be empty unless a real ClassInstance already
// existed. Now GET / fabricates a "scheduled" virtual instance for every
// RoutineSlot that matches the requested date's weekday and has no real
// instance yet. Virtual ids look like: virtual-<routineSlotId>-<yyyy-mm-dd>

function parseVirtualId(id) {
  const m = /^virtual-([a-f0-9]{24})-(\d{4}-\d{2}-\d{2})$/.exec(id);
  if (!m) return null;
  return { routineSlotId: m[1], date: m[2] };
}

// If the given id is virtual, create the real ClassInstance now and return
// its real id. If it's already a real id, return it unchanged.
async function materializeIfVirtual(id) {
  if (!id.startsWith('virtual-')) return id;
  const parsed = parseVirtualId(id);
  if (!parsed) throw new Error('Invalid class reference');
  const slot = await RoutineSlot.findById(parsed.routineSlotId);
  if (!slot) throw new Error('Routine slot not found');
  const created = await ClassInstance.create({
    routineSlotId: slot._id,
    date: parsed.date,
    status: 'scheduled',
    isManuallyAdded: false
  });
  return String(created._id);
}

router.patch('/:id', auth, requireRole('admin', 'moderator', 'teacher'), async (req, res) => {
  let instanceId;
  try {
    instanceId = await materializeIfVirtual(req.params.id);
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }

  const instance = await ClassInstance.findById(instanceId)
    .populate({ path: 'routineSlotId', populate: 'teacherId' });

  if (!instance) return res.status(404).json({ error: 'Class not found' });

  if (req.user.role === 'teacher' &&
      String(instance.routineSlotId.teacherId._id) !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own class' });
  }

  const { status, actualStartTime, actualEndTime, actualRoom, note, force } = req.body;

  // Conflict check only matters if the class will be actively occupying a room
  if (['confirmed', 'rescheduled'].includes(status)) {
    const effectiveRoom = actualRoom || instance.actualRoom || instance.routineSlotId.roomNo;
    const effectiveStart = actualStartTime || instance.actualStartTime || instance.routineSlotId.startTime;
    const effectiveEnd = actualEndTime || instance.actualEndTime || instance.routineSlotId.endTime;

    const conflicts = await findRoomConflicts({
      date: instance.date,
      room: effectiveRoom,
      startTime: effectiveStart,
      endTime: effectiveEnd,
      excludeId: instance._id
    });

    if (conflicts.length > 0 && !force) {
      return res.status(409).json({
        error: 'Room/time conflict detected with another class',
        conflicts: formatConflicts(conflicts)
      });
    }
  }

  Object.assign(instance, {
    status, actualStartTime, actualEndTime, actualRoom, note,
    updatedBy: req.user.id, confirmedAt: new Date()
  });
  await instance.save();

  let urgent = false;
  if (instance.digestSent) {
    await notifyStudentsUrgent(instance, status);
    urgent = true;
  }

  res.json({ success: true, urgent });
});

router.post('/', auth, requireRole('admin', 'moderator', 'teacher'), async (req, res) => {
  const { routineSlotId, date, actualStartTime, actualEndTime, actualRoom, note, force, notifyNow } = req.body;

  const conflicts = await findRoomConflicts({
    date, room: actualRoom, startTime: actualStartTime, endTime: actualEndTime, excludeId: null
  });

  if (conflicts.length > 0 && !force) {
    return res.status(409).json({
      error: 'Room/time conflict detected with another class',
      conflicts: formatConflicts(conflicts)
    });
  }

  const cutoff = new Date(); cutoff.setHours(23, 30, 0, 0);
  const isLate = new Date() > cutoff;
  const shouldNotify = isLate || !!notifyNow;

  const instance = await ClassInstance.create({
    routineSlotId, date, actualStartTime, actualEndTime, actualRoom, note,
    status: 'confirmed', isManuallyAdded: true,
    updatedBy: req.user.id, digestSent: shouldNotify
  });

  if (shouldNotify) await notifyStudentsUrgent(instance, 'newly added');

  res.json({ success: true, instance });
});

router.delete('/:id', auth, requireRole('admin', 'moderator', 'teacher'), async (req, res) => {
  let instanceId;
  try {
    instanceId = await materializeIfVirtual(req.params.id);
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }

  const instance = await ClassInstance.findById(instanceId)
    .populate({ path: 'routineSlotId', populate: 'teacherId' });

  if (!instance) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'teacher' &&
      String(instance.routineSlotId.teacherId._id) !== req.user.id) {
    return res.status(403).json({ error: 'Not your class' });
  }

  const wasDigestSent = instance.digestSent;
  instance.status = 'cancelled';
  await instance.save();

  if (wasDigestSent) await notifyStudentsUrgent(instance, 'deleted/cancelled');

  res.json({ success: true });
});

router.get('/', auth, async (req, res) => {
  const { date, batch } = req.query;

  if (!date) {
    // Legacy behavior: no date given, just return raw stored instances
    let instances = await ClassInstance.find({})
      .populate({ path: 'routineSlotId', populate: ['courseId', 'teacherId'] });
    if (batch) instances = instances.filter(i => i.routineSlotId?.batch === batch);
    if (req.user.role === 'teacher') {
      instances = instances.filter(i => String(i.routineSlotId?.teacherId?._id) === req.user.id);
    }
    return res.json(instances);
  }

  const d = new Date(date);
  const dayStart = new Date(new Date(d).setHours(0, 0, 0, 0));
  const dayEnd = new Date(new Date(d).setHours(23, 59, 59, 999));

  const realInstances = await ClassInstance.find({ date: { $gte: dayStart, $lte: dayEnd } })
    .populate({ path: 'routineSlotId', populate: ['courseId', 'teacherId'] });

  const DAY_MAP = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const weekday = DAY_MAP[d.getDay()];

  let slotFilter = { isOneTime: { $ne: true }, day: weekday };
  if (req.user.role === 'moderator') slotFilter.batch = req.user.batch;
  else if (req.user.role === 'teacher') slotFilter.teacherId = req.user.id;
  else if (batch) slotFilter.batch = batch;

  const matchingSlots = ['SUN','MON','TUE','WED','THU'].includes(weekday)
    ? await RoutineSlot.find(slotFilter).populate('courseId teacherId')
    : [];

  const coveredSlotIds = new Set(realInstances.map(i => String(i.routineSlotId?._id)));
  const virtualInstances = matchingSlots
    .filter(s => !coveredSlotIds.has(String(s._id)))
    .map(s => ({
      _id: `virtual-${s._id}-${date}`,
      routineSlotId: s,
      date,
      status: 'scheduled',
      actualStartTime: null,
      actualEndTime: null,
      actualRoom: null,
      note: '',
      digestSent: false,
      isVirtual: true
    }));

  let instances = [...realInstances, ...virtualInstances];

  if (batch) instances = instances.filter(i => i.routineSlotId?.batch === batch);
  if (req.user.role === 'teacher') {
    instances = instances.filter(i => String(i.routineSlotId?.teacherId?._id) === req.user.id);
  }

  res.json(instances);
});

module.exports = router;