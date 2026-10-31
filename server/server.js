require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs');
const path = require('path');

const app = express();

// Ensure uploads folder exists (Render's filesystem is ephemeral & starts empty on each deploy)
const uploadsDir = path.join(__dirname, 'uploads', 'photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads/photos directory');
}

app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/routine-slots', require('./routes/routineSlots'));
app.use('/api/class-instances', require('./routes/classInstances'));
app.use('/api/cron', require('./routes/cron'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/ocr', require('./routes/ocr'));
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));