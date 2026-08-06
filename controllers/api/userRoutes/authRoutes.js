const router = require('express').Router();
const { Users, Countries } = require('../../../models');
const sequelize = require("../../../config/connection");
const { UniqueConstraintError } = require("sequelize");
const generateWiredUserId = require("../../../utils/generateWiredUserId");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} = require("../../../services/email");

const secret = process.env.SECRET;

router.post('/register', async (req, res) => {

  const {
    first_name,
    last_name,
    email,
    role_id,
    country_id,
    city_id,
    organization_id,
    password
  } = req.body;

  // Check if the email already exists
  const user = await Users.findOne({
    where: { email },
  });

  if (user) {
    return res.status(400).json({
      message: "Email already exists",
    });
  }

  // Validate the country before starting a transaction
  if (country_id) {
    const country = await Countries.findByPk(country_id);

    if (!country) {
      return res.status(400).json({
        message: "Invalid country ID",
      });
    }
  }

  let transaction;

  try {

    transaction = await sequelize.transaction();

    const newUser = await Users.create(
      {
        first_name,
        last_name,
        email,
        role_id,
        country_id,
        city_id,
        organization_id,
        password,
      },
      { transaction }
    );

    newUser.wired_user_id = generateWiredUserId(newUser.id);
    await newUser.save({ transaction });

    await newUser.reload({ transaction });

    await transaction.commit();

    sendWelcomeEmail(newUser).catch((err) => {
      console.error("Welcome email failed:", err);
    });

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        roleId: newUser.role_id,
        country_id: newUser.country_id,
        city_id: newUser.city_id,
        organization_id: newUser.organization_id,
      },
      secret,
      { expiresIn: "10y" }
    );

    return res.status(201).json({
      user: newUser,
      token,
    });

  } catch (err) {

    if (transaction) {
      await transaction.rollback();
    }

    if (err instanceof UniqueConstraintError) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      message: err.message,
    });

  }

});

router.post('/login', async (req, res) => {
  const { email, password } = req.body; // Add "context" to the request body to detect if the request is coming from the general app or the admin dashboard
  try {
    const user = await Users.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        roleId: user.role_id,
        country_id: user.country_id,
        city_id: user.city_id,
        //adding organization_id to the token so it can be used in certain queries
        // organization_id: user.organization_id,
      }, 
      secret, 
      { expiresIn: '10y' }
    );

    res.status(200).json({ 
      message: 'Login successful',
      token, 
      user: {
        id: user.id, 
        email: user.email, 
        roleId: user.role_id,
        firstName: user.first_name,
        lastName: user.last_name,
        countryId: user.country_id,
        cityId: user.city_id,
        organizationId: user.organization_id,
        createdAt: user.createdAt,
      },
     });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/logout', (req, res) => {
  // Optional: Invalidate token on the client-side by removing it from storage
  // Server-side, tokens are typically stateless and don't need invalidation.
  // Logout function on the front end will likely just remove the token from client storage
  res.status(200).json({ message: 'Logout successful' });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({
        message: 'Email is required',
      });
    }

    const user = await Users.findOne({
      where: { email: normalizedEmail },
    });

    if (user) {
      const token = jwt.sign(
        {
          id: user.id,
          purpose: "password-reset",
        },
        secret,
        { expiresIn: '1h' }
      );

      const url = `${process.env.CLIENT_URL}/reset-password/${token}`;

      await sendPasswordResetEmail(
        normalizedEmail,
        url
      );
    }

    return res.status(200).json({
      message:
        'If an account exists for this email, a password reset link has been sent.',
    });

  } catch (err) {
    console.error('Forgot password error:', err);

    return res.status(500).json({
      message: 'Unable to process the password reset request.',
    });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  console.log("Received token:", token);
  if (!password || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long.",
    });;
  }
  try {
    const payload = jwt.verify(token, secret);
    console.log("JWT payload:", payload);

      if (payload.purpose !== "password-reset") {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset link.",
        });
      }

    const user = await Users.findByPk(payload.id);
    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }
    user.password = password;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Password reset successful.",
    });
  } catch (err) {

    if (
      err.name === "TokenExpiredError" ||
      err.name === "JsonWebTokenError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset link.",
      });
    }

    console.error("Reset password error:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password.",
    });

  }
})

module.exports = router;