require('dotenv').config();
const mongoose = require('mongoose');
const Batch = require('../models/Batch');

const ordinals = [
  '8th', '9th', '10th', '11th', '12th', '13th', '14th',
  '15th', '16th', '17th', '18th', '19th', '20th'
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    let createdCount = 0;
    for (const ord of ordinals) {
      const name = `CE ${ord} Batch`;
      const exists = await Batch.findOne({ name });
      if (exists) {
        console.log(`⏭️  Skipped (already exists): ${name}`);
        continue;
      }
      await Batch.create({ name });
      console.log(`✅ Created: ${name}`);
      createdCount++;
    }

    console.log(`\n🎉 Done. ${createdCount} new batch(es) created.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding batches:', err.message);
    process.exit(1);
  }
}

seed();