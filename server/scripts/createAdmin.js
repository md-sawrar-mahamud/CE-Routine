require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const email = 'sarwar@mec.ac.bd';
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('⚠️ Admin already exists:', email);
    process.exit();
  }
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  await User.create({
    fullName: 'Super Admin', email, passwordHash, role: 'admin', isVerified: true
  });
  console.log('✅ Admin created → email: sarwar@mec.ac.bd | password: ChangeMe123!');
  console.log('⚠️ LOGIN AND CHANGE THIS PASSWORD IMMEDIATELY');
  process.exit();
});