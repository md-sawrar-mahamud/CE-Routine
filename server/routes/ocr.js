const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { auth, requireRole } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/parse-routine', auth, requireRole('admin', 'moderator'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    if (!process.env.OCR_SPACE_API_KEY) return res.status(500).json({ error: 'OCR API key not configured on server' });

    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: req.file.originalname || 'routine.jpg' });
    formData.append('apikey', process.env.OCR_SPACE_API_KEY);
    formData.append('language', 'eng');
    formData.append('isTable', 'true');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');

    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const result = response.data;
    if (result.IsErroredOnProcessing) {
      return res.status(400).json({ error: result.ErrorMessage?.[0] || 'OCR processing failed' });
    }

    const text = result.ParsedResults?.[0]?.ParsedText || '';
    res.json({ success: true, text });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.ErrorMessage?.[0] || err.message });
  }
});

module.exports = router;