const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'moderator' && req.user.batch ? { batch: req.user.batch } : {};
    const courses = await Course.find(filter).sort({ code: 1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role === 'moderator' && course.batch !== req.user.batch) {
      return res.status(403).json({ message: 'You can only view courses in your assigned batch' });
    }
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const { code, name, credit, teacherId } = req.body;
    let { batch } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: 'code and name are required' });
    }
    if (req.user.role === 'moderator') {
      batch = req.user.batch; // force moderator's own batch, ignore client value
    }
    if (!batch) {
      return res.status(400).json({ message: 'Batch is required' });
    }
    const existing = await Course.findOne({ code });
    if (existing) return res.status(400).json({ message: 'Course code already exists' });

    const course = await Course.create({ code, name, credit, teacherId, batch });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const existing = await Course.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role === 'moderator' && existing.batch !== req.user.batch) {
      return res.status(403).json({ message: 'You can only edit courses in your assigned batch' });
    }
    const body = { ...req.body };
    if (req.user.role === 'moderator') {
      body.batch = req.user.batch; // prevent moving course to another batch
    }
    const course = await Course.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const existing = await Course.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Course not found' });
    if (req.user.role === 'moderator' && existing.batch !== req.user.batch) {
      return res.status(403).json({ message: 'You can only delete courses in your assigned batch' });
    }
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;