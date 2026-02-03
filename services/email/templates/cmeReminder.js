// services/email/templates/cmeReminder.js
function cmeReminder(user) {
  const fullName = `${user.first_name} ${user.last_name}`;
  const year = new Date().getFullYear();

  return {
    subject: `Reminder: Complete Your ${year} WiRED CME Credits by December 31`,
    html: `
      <h2>CME Completion Reminder</h2>

      <p>Dear ${fullName},</p>

      <p>
        This is a reminder from WiRED International regarding your
        <strong>${year} Community Health Worker (CHW) Continuing Medical Education (CME)</strong>
        requirements.
      </p>

      <p>
        Our records indicate that you have not yet completed the required
        <strong>50 CME credits</strong> needed to receive a CME certificate for the ${year} calendar year.
      </p>

      <p>
        You may continue completing CME modules through
        <strong>December 31, ${year}</strong>.
        All CME credits earned by that date will count toward your ${year} CME certificate.
      </p>

      <p>
        <strong>Important:</strong><br />
        All CME credits are counted within the calendar year only.
        Any credits earned that do not contribute to completing the
        <strong>50-credit requirement</strong> by December 31 will reset on January 1
        and do not carry over into the next year.
      </p>

      <p>
        If you have already completed your CME credits after this message was sent,
        no further action is required.
      </p>

      <p>
        Thank you for your continued commitment to professional development
        and improving community health outcomes.
      </p>

      <p>
        Sincerely,<br />
        <strong>WiRED International</strong><br />
        Community Health Worker CME Program
      </p>
    `,
  };
}

module.exports = cmeReminder;