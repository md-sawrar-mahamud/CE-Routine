async function sendMail({ to, subject, html }) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'CE Routine - MEC', email: process.env.GMAIL_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${errText}`);
    }

    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Mail error:', err.message);
  }
}

module.exports = { sendMail };