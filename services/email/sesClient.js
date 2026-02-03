// services/email/sesClient.js
require("dotenv").config();
const { SESClient } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

module.exports = sesClient;