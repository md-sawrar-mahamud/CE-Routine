const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const AllowedStudent = require('../models/AllowedStudent');
const { sendMail } = require('../utils/mailer');
const { auth, requireRole } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

router.post('/upload-teachers', auth, requireRole('admin', 'moderator'),
  upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rows = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        const created = [], failed = [];
        for (const row of rows) {
          try {
            const email = row.email?.trim().toLowerCase();
            if (!email) { failed.push({ ...row, reason: 'missing email' }); continue; }

            const exists = await User.findOne({ email });
            if (exists) { failed.push({ ...row, reason: 'already exists' }); continue; }

            const tempPassword = crypto.randomBytes(5).toString('hex');
const passwordHash = await bcrypt.hash(tempPassword, 10);

// Create a secure one-time password setup/reset link.
// The raw token goes only to the teacher by email.
// Only its hash is saved in MongoDB.
const setupToken = crypto.randomBytes(32).toString('hex');
const resetTokenHash = crypto
  .createHash('sha256')
  .update(setupToken)
  .digest('hex');

const user = await User.create({
  fullName: row.full_name?.trim(),
  email,
  passwordHash,
  role: 'teacher',
  designation: row.designation?.trim(),
  phone: row.phone?.trim(),
  isVerified: true,
  mustChangePassword: true,
  resetTokenHash,
  resetTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // valid for 24 hours
});

const setupPasswordUrl =
  `${process.env.FRONTEND_URL}/reset-password?token=${setupToken}&id=${user._id}`;

await sendMail({
  to: email,
  subject: '🎓 Set Your CE Routine App Password',
  html: `<div style="font-family:Arial;max-width:500px;line-height:1.6">
    <h2>Welcome, Mr. ${user.fullName}!</h2>

    <p>Your teacher account for <b>CE Routine App · MEC</b> has been created.</p>

    <p>
      <b>Email:</b> ${email}<br/>
      <b>Temporary Password:</b>
      <span style="background:#eee;padding:4px 8px;border-radius:4px">${tempPassword}</span>
    </p>

    <p>
      For a safer and easier first login, click the button below and set your
      own password directly. This link is valid for <b>24 hours</b>.
    </p>

    <a href="${setupPasswordUrl}"
      style="display:inline-block;background:#4f46e5;color:#fff;padding:11px 20px;
      border-radius:6px;text-decoration:none;font-weight:bold">
      Set / Reset Password
    </a>

        <p style="font-size:12px;color:#666;margin-top:18px">
      If you did not expect this account, please contact the CE Routine App administrator.
    </p>
  </div>`
});
            created.push(email);
          } catch (err) {
            failed.push({ ...row, reason: err.message });
          }
        }
        fs.unlinkSync(req.file.path);
        res.json({ createdCount: created.length, created, failed });
      });
  });

router.post('/upload-students', auth, requireRole('admin', 'moderator'),
  upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rows = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        // If moderator, enforce that uploaded students belong strictly to moderator's batch
        const isMod = req.user.role === 'moderator';
        const modBatch = req.user.batch;

        const docs = rows.filter(r => r.reg_no).map(r => ({
          regNo: r.reg_no.trim(),
          fullName: r.full_name?.trim(),
          session: r.session?.trim(),
          batch: isMod ? modBatch : (r.batch?.trim() || 'CE 9th Batch'),
          uploadedBy: req.user.id
        }));

        let count = 0;
        for (const d of docs) {
          await AllowedStudent.updateOne({ regNo: d.regNo }, d, { upsert: true });
          count++;
        }
        fs.unlinkSync(req.file.path);
        res.json({ uploaded: count });
      });
  });

// Get list of allowed students (Moderator sees only their batch; Admin sees all)
router.get('/allowed-students', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const filter = req.user.role === 'moderator' && req.user.batch ? { batch: req.user.batch } : {};
    const list = await AllowedStudent.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student (Moderator can only delete from their own batch)
router.delete('/allowed-students/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const student = await AllowedStudent.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role === 'moderator' && student.batch !== req.user.batch) {
      return res.status(403).json({ error: 'You can only remove students from your assigned batch' });
    }

    await AllowedStudent.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (for admin management)
router.get('/users', auth, requireRole('admin'), async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
  res.json(users);
});

// Get teachers only (admin + moderator can view)
router.get('/teachers', auth, requireRole('admin', 'moderator'), async (req, res) => {
  const teachers = await User.find({ role: 'teacher' }).select('-passwordHash').sort({ createdAt: -1 });
  res.json(teachers);
});

// Admin creates another admin/moderator
// Admin creates another admin/moderator
router.post('/create-staff', auth, requireRole('admin'), async (req, res) => {
  try {
    const { fullName, email, password, role, batch } = req.body;
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    }
    if (!['admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'moderator' && (!batch || !batch.trim())) {
      return res.status(400).json({ error: 'Please assign a batch for this moderator' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName: fullName.trim(),
      email: cleanEmail,
      passwordHash,
      role,
      batch: role === 'moderator' ? batch.trim() : undefined,
      isVerified: true,
      mustChangePassword: true
    });

    res.json({ success: true, user: { id: user._id, email: user.email, role: user.role, batch: user.batch } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    await target.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List admins and moderators (admin only)
router.get('/staff', auth, requireRole('admin'), async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: ['admin', 'moderator'] } })
      .select('-passwordHash -resetTokenHash -resetTokenExpires')
      .sort({ role: 1, createdAt: -1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;