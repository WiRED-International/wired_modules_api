// services/email/sendEmail.js
const { SendEmailCommand, SendRawEmailCommand } = require("@aws-sdk/client-ses");
const sesClient = require("./sesClient");

function buildRawEmail({ from, to, subject, html, attachments = [] }) {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const toList = Array.isArray(to) ? to : [to];

  // Basic headers
  const headers = [
    `From: ${from}`,
    `To: ${toList.join(", ")}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
  ].join("\r\n");

  // HTML part
  const htmlPart = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
  ].join("\r\n");

  // Attachments parts
  const attachmentParts = attachments
    .map((att) => {
      const contentBase64 = Buffer.isBuffer(att.content)
        ? att.content.toString("base64")
        : Buffer.from(att.content).toString("base64");

      return [
        `--${boundary}`,
        `Content-Type: ${att.contentType || "application/octet-stream"}; name="${att.filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${att.filename}"`,
        "",
        // base64 should be wrapped at 76 chars/line for MIME compliance
        contentBase64.match(/.{1,76}/g).join("\r\n"),
        "",
      ].join("\r\n");
    })
    .join("\r\n");

  const closingBoundary = `--${boundary}--\r\n`;

  const raw = headers + htmlPart + attachmentParts + closingBoundary;
  return Buffer.from(raw);
}

/**
 * sendEmail supports:
 * - to: string OR string[]
 * - attachments: [{ filename, content (Buffer), contentType }]
 */
async function sendEmail({ to, subject, html, attachments }) {
  const from = process.env.SES_FROM_EMAIL;

  if (!from) {
    throw new Error("SES_FROM_EMAIL is not set in environment variables.");
  }

  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  // ✅ RAW email path (attachments)
  if (hasAttachments) {
    const rawMessage = buildRawEmail({ from, to, subject, html, attachments });

    const cmd = new SendRawEmailCommand({
      RawMessage: { Data: rawMessage },
    });

    return sesClient.send(cmd);
  }

  // ✅ Simple email path (no attachments)
  const toList = Array.isArray(to) ? to : [to];

  const cmd = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: toList },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: html, Charset: "UTF-8" },
      },
    },
  });

  return sesClient.send(cmd);
}

module.exports = sendEmail;
