const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const { auth, requireRole } = require('../middleware/auth');

// GET all batches (accessible to any logged-in user for dropdowns)
router.get('/', auth, async (req, res) => {
  try {
    const batches = await Batch.find().sort({ name: 1 });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create batch (admin and moderator can create batches)
router.post('/', auth, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const { name, session } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Batch name is required' });
    }

    const cleanName = name.trim();
    const existing = await Batch.findOne({ name: cleanName });
    if (existing) {
      return res.status(400).json({ error: 'Batch already exists' });
    }

    const batch = await Batch.create({ name: cleanName, session: session?.trim() });
    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE batch (admin only)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;