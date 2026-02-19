const sequelize = require('../../config/connection');
const { CmeCertificates } = require('../../models');

/**
 * Atomically generates the next sequence number for a given year
 * and issues a CME certificate.
 */
async function issueCmeCertificate({
  user_id,
  year,
  issued_at,
  pdf_path = null,
}) {
  return sequelize.transaction(async (t) => {
    // 🔒 Lock latest certificate for this year
    const lastCert = await CmeCertificates.findOne({
      where: { year },
      order: [['sequence_number', 'DESC']],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const nextSequence = lastCert
      ? lastCert.sequence_number + 1
      : 1;

    const paddedSeq = String(nextSequence).padStart(6, '0');
    const certificateId = `WIRED-CME-${year}-${paddedSeq}`;

    const certificate = await CmeCertificates.create(
      {
        user_id,
        year,
        sequence_number: nextSequence,
        certificate_id: certificateId,
        issued_at,
        pdf_path,
      },
      { transaction: t }
    );

    return certificate;
  });
}

module.exports = issueCmeCertificate;

