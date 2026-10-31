const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }, // e.g. "CE 9th Batch"
  session: { type: String, trim: true },                            // e.g. "2021-2022"
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);