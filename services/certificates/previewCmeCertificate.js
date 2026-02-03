// services/certificates/previewCmeCredits.js
const fs = require("fs");
const path = require("path");

const generateCmeCertificatePdf = require("./generateCmeCertificatePdf");

async function preview() {
  const buffer = await generateCmeCertificatePdf({
    fullName: "Jane Doe",
    year: new Date().getFullYear(),
    issuedAt: new Date(),
    certificateId: "WIRED-CME-PREVIEW-0001",
  });

  const outPath = path.join(__dirname, "cme_certificate_preview.pdf");
  fs.writeFileSync(outPath, buffer);

  console.log("✅ CME Certificate preview generated:");
  console.log(outPath);
}

preview().catch((err) => {
  console.error("❌ Failed to generate CME certificate preview:", err);
});
