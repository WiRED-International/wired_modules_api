// services/email/templates/cmeCertificate.js
function cmeCertificate(user) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  const year = new Date().getFullYear();

  return {
    subject: `Your ${year} WiRED CME Certificate`,
    html: `
<!DOCTYPE html>
<html>
  <body>
    <h2>Congratulations — CME Certificate Earned</h2>

    <p>Dear ${fullName || "Participant"},</p>

    <p>
      Congratulations on successfully completing <strong>50 Community Health Worker (CHW)
      Continuing Medical Education (CME) credits</strong> for the <strong>${year}</strong> calendar year.
    </p>

    <p>
      Your official CME Certificate is attached to this email as a PDF for your records.
    </p>

    <p>
      All CME credits are counted within the calendar year only. Any credits earned that do not
      contribute to completing the 50-credit requirement by December 31 will reset on January 1
      and do not carry over into the next year. With that in mind, you are welcome to continue 
      downloading and studying modules to advance your knowledge and skills.
    </p>

    <p>
      Sincerely,<br />
      <strong>WiRED International</strong><br />
      Community Health Worker CME Program
    </p>
  </body>
</html>
    `,
  };
}

module.exports = cmeCertificate;
