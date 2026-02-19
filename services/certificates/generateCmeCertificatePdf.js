// services/email/certificates/generateCmeCertificatePdf.js
const PDFDocument = require("pdfkit");
const path = require("path");

const CERTIFICATE_BG = path.join(
  __dirname,
  "assets",
  "cme_certificate_template.png"
);

const TITLE_FONT = path.join(__dirname, "fonts", "the-youngest-serif-display.ttf");
const NAME_FONT = path.join(__dirname, "fonts", "pinyon-script.ttf");
const BODY_FONT = path.join(__dirname, "fonts", "garet-regular.ttf");

function generateCmeCertificatePdf({ fullName, year, issuedAt, certificateId }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pageWidth = 792;
      const pageHeight = 612;

      // Register fonts
      doc.registerFont("Title", TITLE_FONT);
      doc.registerFont("Name", NAME_FONT);
      doc.registerFont("Body", BODY_FONT);

      // 1️⃣ Draw template background
      doc.image(CERTIFICATE_BG, 0, 0, {
        width: pageWidth,
        height: pageHeight,
      });

      const safeName = (fullName || "").trim() || "Participant";

      // ==========================
      // TITLE
      // ==========================
      doc.font("Title")
        .fontSize(50)
        .fillColor("#000000")
        .text("Certificate", 0, 170, {
          width: pageWidth,
          align: "center",
        });

      doc.font("Title")
        .fontSize(20)
        .fillColor("#333333")
        .text(`of CME Achievement for ${year}`, 0, 225, {
          width: pageWidth,
          align: "center",
        });

      // ==========================
      // Presented Line
      // ==========================
      doc.font("Helvetica")
        .fontSize(15)
        .fillColor("#444444")
        .text("This Certificate is Awarded to:", 0, 260, {
          width: pageWidth,
          align: "center",
        });

      // ==========================
      // NAME
      // ==========================
      doc.font("Name")
        .fontSize(50)
        .fillColor("#000000");

      const nameY = 300;
      const nameWidth = doc.widthOfString(safeName);
      const nameX = (pageWidth - nameWidth) / 2;

      doc.text(safeName, nameX, nameY);

      // Draw underline directly under name
      const underlinePadding = 20;
      const underlineY = nameY + 55;

      doc.moveTo(nameX - underlinePadding, underlineY)
        .lineTo(nameX + nameWidth + underlinePadding, underlineY)
        .lineWidth(.8)
        .strokeColor("#1F2A44")
        .stroke();

      // ==========================
      // Completion Text
      // ==========================
      doc.font("Helvetica")
        .fontSize(13)
        .fillColor("#333333")
        .text(
          `For successfully completing 50 continuing Medical Education (CME) credits as part of WiRED’s Community Health Worker (CHW) Continuing Education Program for the ${year} calendar year.`,
          110,
          385,
          {
            width: pageWidth - 220,
            align: "center",
            lineGap: 3,
          }
        );

      // ==========================
      // Footer Metadata
      // ==========================
      const issued = issuedAt instanceof Date ? issuedAt : new Date();
      const issuedStr = issued.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc.font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(`Issued on: ${issuedStr}`, 40, 515);

      if (certificateId) {
        doc.text(`Certificate ID: ${certificateId}`, 40, 528);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateCmeCertificatePdf;
