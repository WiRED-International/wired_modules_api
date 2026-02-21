// services/email/templates/welcomeEmail.js

function welcomeEmail(user) {
  const firstName = user.first_name;

  return {
    subject: "Welcome to the WiRED Continuing Medical Education (CME) Program",
    html: `
      <p>Hello ${firstName || "there"},</p>

      <p>
        Welcome to the <strong>WiRED International Continuing Medical Education (CME) Program</strong>.
        You now have access to educational modules designed to support Community Health Workers
        through evidence-based training and assessment.
      </p>

      <p>
        Through this platform, you can complete CME-eligible modules, track your earned CME credits,
        and receive an official CME certificate upon successful completion of the annual requirements.
      </p>

      <p>
        <strong>Program Partnerships & Expansion</strong><br />
        If you are a Community Health Worker manager or operate a CHW program and are interested in
        implementing WiRED International’s CME program within your organization
        <strong>free of charge</strong>, we encourage you to contact WiRED International for more information.
      </p>

      <p>
        Additionally, if you are interested in establishing a new Community Health Worker program in your
        region, WiRED International works with organizations globally to support the development of
        CHW training programs at no cost.
      </p>

      <p>
        <strong>Contact Us</strong><br />
        For questions, partnerships, or support, please email us at
        <a href="mailto:contact@wiredinternational.org">
          contact@wiredinternational.org
        </a>.
      </p>

      <p>
        We’re glad to have you as part of the program and appreciate your commitment to community health.
      </p>

      <p>
        Sincerely,<br />
        <strong>WiRED International</strong><br />
        HealthMAP Program
      </p>

      <p>
        For more information about WiRED’s CME program:
        <a href="https://wiredinternational.org" target="_blank">
          https://wiredinternational.org
        </a>
      </p>
    `,
  };
}

module.exports = welcomeEmail;
