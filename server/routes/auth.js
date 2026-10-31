const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AllowedStudent = require('../models/AllowedStudent');
const { sendMail } = require('../utils/mailer');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');


const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/photos'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user?.id || 'user'}-${Date.now()}${ext}`);
  }
});
const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Only JPG, PNG, or WEBP images allowed'));
    cb(null, true);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user._id, role: user.role, batch: user.batch, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id, fullName: user.fullName, email: user.email,
        role: user.role, batch: user.batch, mustChangePassword: user.mustChangePassword
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register-student', async (req, res) => {
  try {
    const { fullName, email, password, regNo } = req.body;
    if (!fullName || !email || !password || !regNo) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const allowed = await AllowedStudent.findOne({ regNo: regNo.trim() });
    if (!allowed) return res.status(403).json({ error: 'Registration number not found in approved list. Contact admin.' });
    if (allowed.isUsed) return res.status(403).json({ error: 'This registration number has already been used.' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      fullName, email: email.toLowerCase().trim(), passwordHash,
      role: 'student', regNo: allowed.regNo, session: allowed.session,
      batch: allowed.batch, isVerified: true
    });

    allowed.isUsed = true;
    await allowed.save();

    res.json({ success: true, message: 'Registration successful! You can login now.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json({ success: true });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetTokenExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user._id}`;
    await sendMail({
      to: user.email,
      subject: '🔑 Reset Your Password',
      html: `<p>Click below to reset your password (valid 15 minutes):</p><a href="${resetUrl}">Reset Password</a>`
    });

    res.json({ success: true, message: 'Reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { id, token, newPassword } = req.body;
    const user = await User.findById(id);
    if (!user || !user.resetTokenHash) return res.status(400).json({ error: 'Invalid or expired token' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== user.resetTokenHash || Date.now() > user.resetTokenExpires) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Changed: now uses logged-in user's token instead of trusting userId from body
router.post('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Old password incorrect' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: get my own profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -resetTokenHash -resetTokenExpires');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: update email (requires current password to confirm identity)
router.put('/update-email', auth, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
      return res.status(400).json({ error: 'New email and current password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const cleanEmail = newEmail.toLowerCase().trim();
    const exists = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
    if (exists) return res.status(400).json({ error: 'Email already in use' });

    user.email = cleanEmail;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, batch: user.batch, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ success: true, message: 'Email updated', token, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: update basic profile info (name, phone)
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    await user.save();

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




router.post('/upload-photo', auth, uploadPhoto.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.photoUrl = `/uploads/photos/${req.file.filename}`;
    await user.save();
    res.json({ success: true, photoUrl: user.photoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;