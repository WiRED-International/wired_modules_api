module.exports = function passwordReset(resetUrl) {

  return {

    subject: "Reset your HealthMAP password",

    html: `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">

        <h2>Reset Your Password</h2>

        <p>
          We received a request to reset the password for your HealthMAP account.
        </p>

        <p>
          Click the button below to choose a new password.
        </p>

        <p style="margin:40px 0; text-align:center;">

          <a
            href="${resetUrl}"
            style="
              background:#0d6efd;
              color:#ffffff;
              padding:14px 24px;
              border-radius:6px;
              text-decoration:none;
              display:inline-block;
              font-weight:bold;
            "
          >
            Reset Password
          </a>

        </p>

        <p>
          This password reset link will expire in <strong>1 hour</strong>.
        </p>

        <p>
          If you didn't request this change, you can safely ignore this email.
        </p>

        <hr>

        <small>
          WiRED International / HealthMAP
        </small>

      </div>
    `

  };

};