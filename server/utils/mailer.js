const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
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