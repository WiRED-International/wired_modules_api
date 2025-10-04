require('dotenv').config();
const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");
const multer = require("multer");

const upload = multer(); // store file in memory

AWS.config.update({
  region: "us-east-1", 
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

router.post("/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    const { recipient, senderName, message } = req.body;
    const fileBuffer = req.file.buffer;
    const boundary = "NextPart";

    const rawEmail = buildRawEmail({
      from: process.env.SENDER_EMAIL,
      to: recipient,
      subject: `CME Report from ${senderName}`,
      message,
      fileBuffer,
      fileName: req.file.originalname,
      boundary,
    });

    await ses.sendRawEmail({ RawMessage: { Data: rawEmail } }).promise();

    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ message: "Failed to send email", error: err.message });
  }
});

function buildRawEmail({ from, to, subject, message, fileBuffer, fileName, boundary }) {
  const raw =
    `From: ${from}\n` +
    `To: ${to}\n` +
    `Subject: ${subject}\n` +
    `MIME-Version: 1.0\n` +
    `Content-Type: multipart/mixed; boundary="${boundary}"\n\n` +

    `--${boundary}\n` +
    `Content-Type: text/plain; charset=UTF-8\n\n` +
    `${message || "Attached is your CME PDF report."}\n\n` +

    `--${boundary}\n` +
    `Content-Type: application/pdf; name="${fileName}"\n` +
    `Content-Disposition: attachment; filename="${fileName}"\n` +
    `Content-Transfer-Encoding: base64\n\n` +
    fileBuffer.toString("base64") +
    `\n--${boundary}--`;

  return Buffer.from(raw);
}

module.exports = router;
