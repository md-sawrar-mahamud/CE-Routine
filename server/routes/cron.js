const express = require('express');
const router = express.Router();
const RoutineSlot = require('../models/RoutineSlot');
const ClassInstance = require('../models/ClassInstance');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/mailer');

function verifyCronSecret(req, res, next) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized cron call' });
  }
  next();
}

router.post('/teacher-reminder', verifyCronSecret, async (req, res) => {
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayName = days[tomorrow.getDay()];
  const dateOnly = new Date(new Date(tomorrow).setHours(0,0,0,0));

  const slots = await RoutineSlot.find({ day: dayName }).populate('courseId teacherId');
  let count = 0;

  for (const slot of slots) {
    const exists = await ClassInstance.findOne({ routineSlotId: slot._id, date: dateOnly });
    if (exists) continue;

    await ClassInstance.create({ routineSlotId: slot._id, date: dateOnly, status: 'scheduled' });
    count++;

    if (slot.teacherId) {
      await Notification.create({
        userId: slot.teacherId._id,
        message: `Tomorrow you have ${slot.courseId.code} at ${slot.startTime} in ${slot.roomNo}. Please confirm or update.`,
        type: 'reminder'
      });
      sendMail({
        to: slot.teacherId.email,
        subject: "📅 Confirm Tomorrow's Class",
        html: `<p>Hi ${slot.teacherId.fullName},</p>
               <p>Tomorrow: <b>${slot.courseId.code} - ${slot.courseId.name}</b><br/>
               Time: ${slot.startTime} - ${slot.endTime}<br/>Room: ${slot.roomNo}</p>
               <p>Please login to confirm, postpone, or reschedule.</p>
               <a href="${process.env.FRONTEND_URL}/teacher/dashboard">Open Dashboard</a>`
      });
    }
  }
  res.json({ success: true, generated: count });
});

router.post('/student-digest', verifyCronSecret, async (req, res) => {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const dateOnly = new Date(new Date(tomorrow).setHours(0,0,0,0));
  const dateEnd = new Date(new Date(tomorrow).setHours(23,59,59,999));

  const instances = await ClassInstance.find({ date: { $gte: dateOnly, $lte: dateEnd } })
    .populate({ path: 'routineSlotId', populate: 'courseId teacherId' });

  const batches = {};
  for (const inst of instances) {
    const batch = inst.routineSlotId?.batch;
    if (!batch) continue;
    if (!batches[batch]) batches[batch] = [];
    batches[batch].push(inst);

    inst.digestSent = true;
    await inst.save();
  }

  for (const batch in batches) {
    const students = await User.find({ role: 'student', batch });
    const list = batches[batch].map(i =>
      `${i.routineSlotId.courseId.code} — ${i.status.toUpperCase()} — ${i.actualStartTime || i.routineSlotId.startTime}, Room ${i.actualRoom || i.routineSlotId.roomNo}`
    ).join('<br/>');

    for (const s of students) {
      await Notification.create({ userId: s._id, message: `Tomorrow's Routine:<br/>${list}`, type: 'digest' });
      sendMail({ to: s.email, subject: "📘 Tomorrow's Class Routine", html: `<div>${list}</div>` });
    }
  }

  res.json({ success: true, batches: Object.keys(batches) });
});

module.exports = router;