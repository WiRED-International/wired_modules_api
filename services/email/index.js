// utils/email/index.js
const sendEmail = require("./sendEmail");

const welcomeEmail = require("./templates/welcomeEmail");
const cmeCertificate = require("./templates/cmeCertificate");
const cmeReminder = require("./templates/cmeReminder");
const generateCmeCertificatePdf = require('../../services/certificates/generateCmeCertificatePdf');


async function sendWelcomeEmail(user) {
  const { subject, html } = welcomeEmail(user);
  return sendEmail({ to: user.email, subject, html });
}

async function sendCme50AchievedEmail(user, certificate) {
  const { subject, html } = cmeCertificate(user);

  const fullName = `${user.first_name} ${user.last_name}`.trim();
  const year = certificate.year;
  const issuedAt = new Date(certificate.issued_at);
  const certificateId = certificate.certificate_id;

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
        filename: `${certificate.certificate_id}.pdf`,
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
