// netlify/functions/order.js
//
// Receives an order from the Yard Connect website and forwards it to the
// site owner via WhatsApp (Twilio) and email (SMTP). The customer never
// sees WhatsApp or email — they just get a success/failure response.
//
// Required environment variables (set these in Netlify: Site settings >
// Environment variables — never commit real values to the repo):
//
//   TWILIO_ACCOUNT_SID     Twilio Account SID
//   TWILIO_AUTH_TOKEN      Twilio Auth Token
//   TWILIO_WHATSAPP_FROM   Twilio's WhatsApp sender, e.g. 'whatsapp:+14155238886'
//   OWNER_WHATSAPP_TO      Your WhatsApp number, e.g. 'whatsapp:+233591580768'
//
//   SMTP_HOST              e.g. 'smtp.gmail.com'
//   SMTP_PORT              e.g. 587
//   SMTP_SECURE            'true' if using port 465, otherwise 'false'
//   SMTP_USER              the mailbox username to send from
//   SMTP_PASS              the mailbox password / app password
//   SMTP_FROM              (optional) from-address to show, defaults to SMTP_USER
//   OWNER_EMAIL_TO         where the order email should land

const twilio = require('twilio');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const { name, phone, items, total } = data;

  if (!name || !phone || !Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing order details' }) };
  }

  const lines = items
    .map((i) => `- ${i.name}  x${i.qty}  GHS ${i.lineTotal}`)
    .join('\n');

  const message =
`New order — Yard Connect

${lines}

Total: GHS ${total}

Name: ${name}
Phone: ${phone}`;

  const results = { whatsapp: false, email: false, errors: [] };

  // --- WhatsApp via Twilio ---
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials are not configured');
    }
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.OWNER_WHATSAPP_TO,
      body: message,
    });
    results.whatsapp = true;
  } catch (err) {
    console.error('WhatsApp send failed:', err.message);
    results.errors.push('whatsapp: ' + err.message);
  }

  // --- Email via SMTP ---
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials are not configured');
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.OWNER_EMAIL_TO,
      subject: `New Yard Connect order — GHS ${total} (${name})`,
      text: message,
    });
    results.email = true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    results.errors.push('email: ' + err.message);
  }

  // The order isn't lost as long as at least one channel got through.
  if (!results.whatsapp && !results.email) {
    return {
      statusCode: 502,
      body: JSON.stringify({ ok: false, ...results }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, ...results }),
  };
};
