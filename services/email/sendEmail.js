// services/email/sendEmail.js
const nodemailer = require("nodemailer");
const AWS = require("aws-sdk");

AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
});

// SES v2 client — REQUIRED for Nodemailer
const ses = new AWS.SES({ apiVersion: "2010-12-01" });

const transporter = nodemailer.createTransport({
  SES: ses,
});

console.log("sendRawEmail exists:", typeof ses.sendRawEmail);

/**
 * sendEmail supports:
 * - to: string OR string[]
 * - attachments: [{ filename, content (Buffer), contentType }]
 */
async function sendEmail({ to, subject, html, attachments = [] }) {
  const from = process.env.SES_FROM_EMAIL;

  if (!from) {
    throw new Error("SES_FROM_EMAIL is not set in environment variables.");
  }

  const toList = Array.isArray(to) ? to : [to];

  const mailOptions = {
    from,
    to: toList.join(", "),
    subject: String(subject || "").replace(/[\r\n]+/g, " ").trim(),
    html: html || "",
  };

  if (attachments.length > 0) {
    mailOptions.attachments = attachments.map(att => ({
      filename: att.filename,
      content: att.content,           // Buffer
      contentType: att.contentType || "application/pdf",
    }));
  }

  return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
