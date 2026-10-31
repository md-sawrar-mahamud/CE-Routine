const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },
  connectionTimeout: 10000, // fail fast (10s) instead of hanging ~2 min
  greetingTimeout: 10000,
  socketTimeout: 10000
});

async function sendMail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"CE Routine - MEC" <${process.env.GMAIL_USER}>`,
      to, subject, html
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Mail error:', err.message);
  }
}

module.exports = { sendMail };