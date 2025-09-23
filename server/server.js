require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK; // webhook URL
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

if (!DISCORD_WEBHOOK) {
  console.warn('Warning: DISCORD_WEBHOOK not configured. Requests will not be forwarded to Discord.');
}

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

// POST /api/request-payment
// body: { name, email, tier, method, account, reference, proof }
app.post('/api/request-payment', async (req, res) => {
  const data = req.body;
  data.receivedAt = Date.now();

  // Forward to Discord if configured
  if (DISCORD_WEBHOOK) {
    try {
      const content = `New payment request:\nTier: ${data.tier}\nName: ${data.name || '—'}\nEmail: ${data.email || '—'}\nAccount: ${data.account || '—'}\nMethod: ${data.method}\nReference: ${data.reference || '—'}\nProof: ${data.proof || '—'}`;
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    } catch (err) {
      console.error('Failed to post to Discord webhook', err);
    }
  }

  // Store locally (for demo we write to an in-memory array)
  // In production you'd persist this to a DB
  if (!global.requests) global.requests = [];
  const id = 'srv_' + Date.now();
  const reqObj = { id, ...data, status: 'pending' };
  global.requests.push(reqObj);

  res.json({ ok: true, id });
});

// Admin endpoint to approve
// POST /api/admin/approve
// body: { id, tier, email }
app.post('/api/admin/approve', async (req, res) => {
  const { id, tier, email } = req.body;
  // create a secure activation code
  const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars

  // Store code on request
  if (global.requests) {
    const r = global.requests.find(x => x.id === id);
    if (r) {
      r.status = 'approved';
      r.activationCode = code;
    }
  }

  // Post code & details to Discord webhook (so admins can see code and send it)
  if (DISCORD_WEBHOOK) {
    try {
      const content = `✅ Approved payment request\nTier: ${tier}\nEmail: ${email || '—'}\nCode: **${code}**`;
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    } catch (err) {
      console.error('Failed to post activation to Discord webhook', err);
    }
  }

  // Send activation code via email if transporter available
  if (transporter && email) {
    try {
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: `Galactic Snake - ${tier} Activation Code`,
        text: `Your activation code for ${tier} is: ${code}\n\nEnter this code in the game to activate your subscription.`
      });
    } catch (err) {
      console.error('Failed to send email', err);
      return res.status(500).json({ ok: false, error: 'Failed to send email' });
    }
  }

  res.json({ ok: true, code });
});

// Verify activation code endpoint
app.post('/api/admin/verify-code', (req, res) => {
  const { code } = req.body;
  if (!global.requests) return res.json({ ok: false });
  const r = global.requests.find(x => x.activationCode === code);
  if (!r) return res.json({ ok: false });
  // Return tier so client can activate locally
  return res.json({ ok: true, tier: r.tier });
});

// Allow admin to list pending
app.get('/api/admin/requests', (req, res) => {
  res.json(global.requests || []);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
