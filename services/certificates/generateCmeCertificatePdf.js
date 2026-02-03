// services/email/certificates/generateCmeCertificatePdf.js
const PDFDocument = require("pdfkit");
const path = require("path");
const SIGNATURE_FONT = path.join(
  __dirname,
  "fonts",
  "GreatVibes-Regular.ttf" // or Allura-Regular.ttf
);

/**
 * Generates a professional-looking CME certificate PDF as a Buffer.
 *
 * @param {Object} params
 * @param {string} params.fullName
 * @param {number} params.year
 * @param {Date}   params.issuedAt
 * @param {string} [params.certificateId] optional
 * @returns {Promise<Buffer>}
 */
function generateCmeCertificatePdf({ fullName, year, issuedAt, certificateId }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        layout: "landscape",
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: {
          Title: `WiRED CME Certificate ${year} - ${fullName}`,
          Author: "WiRED International",
        },
      });

      doc.registerFont("Signature", SIGNATURE_FONT);

      // 🔒 Force page initialization
      doc.addPage();

      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pageWidth = 792;   // LETTER landscape width
      const pageHeight = 612;  // LETTER landscape height

      // -------------------------
      // Palette (simple + professional)
      // -------------------------
      const accent = "#3F5FBF";
      const accent2 = "#6A5ACD"; // muted purple
      const border = "#AAB2C8";
      const text = "#1A1A1A";
      const subtle = "#4A4A4A";

      // -------------------------
      // Background (white)
      // -------------------------
      doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");

      // // -------------------------
      // // Accent bars (safe placeholder for ribbons)
      // // -------------------------
      // doc.save();
      // doc.fillColor(accent);
      // doc.rect(0, 0, pageWidth, 18).fill(); // top bar
      // doc.fillColor(accent2);
      // doc.rect(0, pageHeight - 18, pageWidth, 18).fill(); // bottom bar
      // doc.restore();

      // -------------------------
      // Border + inner border
      // -------------------------
      const outerMargin = 28;
      const innerMargin = 44;

      doc.save();
      doc.lineWidth(2).strokeColor(border);
      doc.rect(outerMargin, outerMargin, pageWidth - outerMargin * 2, pageHeight - outerMargin * 2).stroke();
      doc.lineWidth(1).strokeColor("#D6DBEA");
      doc.rect(innerMargin, innerMargin, pageWidth - innerMargin * 2, pageHeight - innerMargin * 2).stroke();
      doc.restore();

      // // -------------------------
      // // Header branding
      // // -------------------------
      // doc.fillColor(text);
      // doc.font("Helvetica-Bold").fontSize(18).text("WiRED International", innerMargin + 12, innerMargin + 10, {
      //   align: "left",
      // });

      // doc.fillColor(subtle);
      // doc.font("Helvetica").fontSize(11).text("Community Health Worker CME Program", innerMargin + 12, innerMargin + 34, {
      //   align: "left",
      // });

      // // Right-side header text (acts like the “other logo” spot)
      // doc.fillColor(subtle);
      // doc.font("Helvetica").fontSize(10).text("Certificate Issued by", pageWidth - innerMargin - 220, innerMargin + 18, {
      //   width: 208,
      //   align: "right",
      // });

      // doc.fillColor(text);
      // doc.font("Helvetica-Bold").fontSize(12).text("WiRED International", pageWidth - innerMargin - 220, innerMargin + 34, {
      //   width: 208,
      //   align: "right",
      // });

      // -------------------------
      // Header logos
      // -------------------------
      const rigntLogoHeight = 100;
      const leftLogoHeight = 100;

      // Top-left logo
      doc.image(
        path.join(__dirname, "assets/wired_logo1.png"),
        innerMargin + 8,
        innerMargin + 8,
        { height: leftLogoHeight }
      );

      // Top-right logo
      doc.image(
        path.join(__dirname, "assets/chw_cme_logo.png"),
        pageWidth - innerMargin - 140,
        innerMargin + 8,
        { height: rigntLogoHeight }
      );

      // -------------------------
      // Main title
      // -------------------------
      const centerX = pageWidth / 2;

      doc.fillColor(accent);
      doc.font("Times-Bold").fontSize(36).text(
        "Certificate of Completion",
        0,
        170,   // ⬅️ moved down 20px
        { width: pageWidth, align: "center" }
      );

      // Presented to
      doc.fillColor(subtle);
      doc.font("Helvetica").fontSize(14).text("Presented to", 0, 220, {
        width: pageWidth,
        align: "center",
      });

      // Recipient name
      const safeName = (fullName || "").trim() || "Participant";
      doc.fillColor(text);
      doc.font("Times-BoldItalic").fontSize(34).text(safeName, 0, 252, {
        width: pageWidth,
        align: "center",
      });

      // Completion statement
      doc.fillColor(subtle);
      doc.font("Helvetica").fontSize(13).text(
        `For successfully completing fifty (50) Continuing Medical Education (CME) credits as part of the ` +
        `Community Health Worker (CHW) Continuing Education Program for the ${year} calendar year.`,
        innerMargin + 40,     // ⬅️ use more horizontal space
        315,                 // ⬅️ slightly lower to rebalance
        {
          width: pageWidth - (innerMargin + 40) * 2,
          align: "center",
          lineGap: 6,
        }
      );

      // -------------------------
      // Center gold seal
      // -------------------------
      const sealSize = 100;
      const sealY = 370;

      doc.image(
        path.join(__dirname, "assets/gold_seal.png"),
        pageWidth / 2 - sealSize / 2,
        sealY,
        {
          width: sealSize,
          opacity: 0.80,
        }
      );

      // Signature lines (placeholder – you can add names later)
      const sigY = pageHeight - innerMargin - 70;
      const leftSigX = innerMargin + 80;
      const rightSigX = pageWidth - innerMargin - 280;

      // -------------------------
      // Footer block (issue date + certificate id)
      // -------------------------
      const issued = issuedAt instanceof Date ? issuedAt : new Date();
      const issuedStr = issued.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      doc.fillColor(text);
      doc.font("Helvetica").fontSize(11);

      // -------------------------
      // Issue metadata (BOTTOM-LEFT, audit zone)
      // -------------------------
      const auditY = pageHeight - innerMargin - 26;

      doc.font("Helvetica")
        .fontSize(9)
        .fillColor("#555")
        .text(
          `Issued on: ${issuedStr}`,
          innerMargin + 12,
          auditY
        );

      if (certificateId) {
        doc.text(
          `Certificate ID: ${certificateId}`,
          innerMargin + 12,
          auditY + 12
        );
      }

      // Handwritten signatures (script font)
      doc.font("Signature")
        .fontSize(24)
        .fillColor("#222");

      // Left handwritten signature
      doc.text(
        "Miriam Othman",
        leftSigX,
        sigY - 26,
        { width: 240, align: "center" }
      );

      // Right handwritten signature
      doc.text(
        "Gary Selnow",
        rightSigX,
        sigY - 26,
        { width: 240, align: "center" }
      );


      doc.save();
      doc.strokeColor("#222").lineWidth(1);
      doc.moveTo(leftSigX, sigY).lineTo(leftSigX + 240, sigY).stroke();
      doc.moveTo(rightSigX, sigY).lineTo(rightSigX + 240, sigY).stroke();
      doc.restore();

      doc.fillColor(subtle);
      // LEFT signature block (Medical Education)
      doc.font("Helvetica").fontSize(10).fillColor(subtle).text(
        "Miriam Othman, M.D., M.P.H\nWiRED Director of Medical Education",
        leftSigX,
        sigY + 8,
        { width: 240, align: "center", lineGap: 2 }
      );

      // RIGHT signature block (Executive Director)
      doc.font("Helvetica").fontSize(10).fillColor(subtle).text(
        "Gary Selnow, Ph.D\nFounder and Executive Director",
        rightSigX,
        sigY + 8,
        { width: 240, align: "center", lineGap: 2 }
      );

      // Done
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateCmeCertificatePdf;
