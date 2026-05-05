const util = require('util');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SENDGRID_FROM || 'no-reply@campusfind.example.com';

if (SENDGRID_API_KEY) {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(SENDGRID_API_KEY);

  async function sendMail(to, subject, text, html) {
    try {
      const msg = {
        to,
        from: EMAIL_FROM,
        subject,
        text: text || '',
        html: html || ''
      };
      await sgMail.send(msg);
      console.log('sendMail: SendGrid API - message sent to', to);
      return true;
    } catch (err) {
      console.error('sendMail (SendGrid API) error', err?.message || err);
      if (err && err.response && err.response.body) {
        console.error('sendgrid response body:', util.inspect(err.response.body, { depth: 4 }));
      }
      throw err;
    }
  }

  module.exports = { sendMail };
  return;
}

// ----- fallback to Nodemailer SMTP ----- //
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || (SMTP_PORT === 465);

let transporter = null;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
} else {
  console.warn('Email service: no SENDGRID_API_KEY and no SMTP config found — email will fail.');
}

async function sendMail(to, subject, text, html) {
  if (!transporter) {
    const err = new Error('No email transport configured');
    console.error('sendMail error:', err.message);
    throw err;
  }
  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text: text || '',
      html: html || ''
    });
    console.log('sendMail (SMTP) sent', info && info.messageId);
    return info;
  } catch (err) {
    console.error('sendMail (SMTP) error', err && err.message);
    throw err;
  }
}

module.exports = { sendMail };
