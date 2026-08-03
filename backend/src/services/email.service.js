const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Transactional email, via Resend's REST API.
 *
 * Two rules shape everything here:
 *
 * 1. **Email never breaks a request.** Every send is fire-and-forget — a
 *    failing mail provider must not stop a signup completing or a payment
 *    being credited. Failures are logged, not thrown.
 * 2. **Unconfigured is a valid state.** With no API key the service reports
 *    `isConfigured() === false` and sends nothing, so dev and the test suite
 *    run without credentials and without hitting the network.
 *
 * Resend is a plain `POST /emails`, so it goes through axios rather than
 * pulling in an SDK. Swapping to Postmark means changing `deliver()` only.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10000;

function apiKey() {
  return process.env.EMAIL_PROVIDER_API_KEY || '';
}

function fromAddress() {
  return process.env.EMAIL_FROM_ADDRESS || 'AI Studio <onboarding@resend.dev>';
}

function isConfigured() {
  return Boolean(apiKey());
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

/** Every send goes through here, so there is exactly one network call to mock. */
async function deliver({ to, subject, html }) {
  if (!isConfigured()) {
    logger.warn(`Email not sent to ${to} ("${subject}") — EMAIL_PROVIDER_API_KEY is not set`);
    return { sent: false, reason: 'not_configured' };
  }

  const response = await axios.post(
    RESEND_ENDPOINT,
    { from: fromAddress(), to: [to], subject, html },
    {
      headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
      timeout: SEND_TIMEOUT_MS,
    }
  );

  logger.info(`Email "${subject}" sent to ${to} (id ${response.data?.id || 'unknown'})`);
  return { sent: true, id: response.data?.id };
}

/**
 * Wraps deliver() so callers can't accidentally make email a hard dependency
 * of a user-facing request. Returns a promise that never rejects.
 */
function send(payload) {
  return deliver(payload).catch((err) => {
    const detail = err.response?.data?.message || err.message;
    logger.error(`Email "${payload.subject}" to ${payload.to} failed: ${detail}`);
    return { sent: false, reason: 'error', error: detail };
  });
}

// --- templates -------------------------------------------------------------
// Inline styles only: every mail client strips <style> blocks, and the palette
// matches the app's cream/ink theme. No emoji anywhere, same as the UI.

const BRAND = { canvas: '#faf7f1', ink: '#1c1a17', muted: '#6d655a', accent: '#5b45e0', line: '#e8e0d3' };

function layout(heading, bodyHtml) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:${BRAND.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:15px;font-weight:700;color:${BRAND.accent};">AI Studio</p>
          <h1 style="margin:12px 0 0;font-size:20px;line-height:1.35;color:${BRAND.ink};">${heading}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 28px 28px;font-size:15px;line-height:1.6;color:${BRAND.muted};">
          ${bodyHtml}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;margin:8px 0;padding:12px 22px;background:${BRAND.accent};color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px;">${label}</a>`;
}

function sendPasswordResetEmail(user, rawToken) {
  const url = `${frontendUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

  return send({
    to: user.email,
    subject: 'Parolni tiklash — AI Studio',
    html: layout(
      'Parolni tiklash',
      `<p style="margin:0 0 16px;">Salom${user.name ? `, ${user.name}` : ''}! Hisobingiz uchun parolni tiklash so'raldi.</p>
       ${button(url, 'Yangi parol o‘rnatish')}
       <p style="margin:16px 0 0;font-size:13px;">Havola 1 soat davomida amal qiladi va faqat bir marta ishlatiladi.</p>
       <p style="margin:8px 0 0;font-size:13px;">Agar bu so'rovni siz yubormagan bo'lsangiz, bu xatni e'tiborsiz qoldiring — parolingiz o'zgarmaydi.</p>`
    ),
  });
}

function sendWelcomeEmail(user, { credits } = {}) {
  return send({
    to: user.email,
    subject: 'AI Studio\'ga xush kelibsiz',
    html: layout(
      'Xush kelibsiz',
      `<p style="margin:0 0 16px;">Salom${user.name ? `, ${user.name}` : ''}! Hisobingiz tayyor${
        credits ? ` va unga ${credits} kredit qo'shildi` : ''
      }.</p>
       <p style="margin:0 0 16px;">G'oyangizni ayting — video, rasm, ovoz yoki matn kerakligini AI o'zi aniqlab, tayyorlab beradi.</p>
       ${button(frontendUrl(), 'Boshlash')}`
    ),
  });
}

function sendPaymentReceiptEmail(user, { packageName, credits, amountUsd }) {
  const amount = typeof amountUsd === 'number' ? `$${amountUsd.toFixed(2)}` : null;

  return send({
    to: user.email,
    subject: "To'lov cheki — AI Studio",
    html: layout(
      "To'lovingiz uchun rahmat",
      `<p style="margin:0 0 16px;">${packageName} to'plami hisobingizga qo'shildi.</p>
       <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${BRAND.line};margin:0 0 16px;">
         <tr><td style="padding:10px 0;">To'plam</td><td style="padding:10px 0;text-align:right;color:${BRAND.ink};font-weight:600;">${packageName}</td></tr>
         <tr><td style="padding:10px 0;border-top:1px solid ${BRAND.line};">Kreditlar</td><td style="padding:10px 0;border-top:1px solid ${BRAND.line};text-align:right;color:${BRAND.ink};font-weight:600;">+${credits}</td></tr>
         ${amount ? `<tr><td style="padding:10px 0;border-top:1px solid ${BRAND.line};">Summa</td><td style="padding:10px 0;border-top:1px solid ${BRAND.line};text-align:right;color:${BRAND.ink};font-weight:600;">${amount}</td></tr>` : ''}
       </table>
       ${button(frontendUrl(), 'Ishni davom ettirish')}`
    ),
  });
}

module.exports = {
  isConfigured,
  send,
  deliver,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPaymentReceiptEmail,
};
