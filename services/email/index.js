// utils/email/index.js
const sendEmail = require("./sendEmail");

const welcomeEmail = require("./templates/welcomeEmail");
const cmeCertificate = require("./templates/cmeCertificate");
const cmeReminder = require("./templates/cmeReminder");

async function sendWelcomeEmail(user) {
  const { subject, html } = welcomeEmail(user);
  return sendEmail({ to: user.email, subject, html });
}

async function sendCme50AchievedEmail(user) {
  const { subject, html } = cmeCertificate(user);

  const fullName = `${user.first_name} ${user.last_name}`.trim();
  const year = new Date().getFullYear();

  // Use the issued timestamp if present, else now
  const issuedAt = user.cme_certificate_issued_at
    ? new Date(user.cme_certificate_issued_at)
    : new Date();

  // Optional certificate ID (simple + deterministic)
  const certificateId = `WIRED-CME-${year}-U${user.id}`;

  const pdfBuffer = await generateCmeCertificatePdf({
    fullName,
    year,
    issuedAt,
    certificateId,
  });

  return sendEmail({
    to: user.email,
    subject,
    html,
    attachments: [
      {
        filename: `WiRED_CME_Certificate_${year}_${user.id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

async function sendCmeReminderEmail(user) {
  const { subject, html } = cmeReminder(user);
  return sendEmail({ to: user.email, subject, html });
}

module.exports = {
  sendWelcomeEmail,
  sendCme50AchievedEmail,
  sendCmeReminderEmail,
};
