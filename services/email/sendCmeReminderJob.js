// services/email/sendCmeReminderJob.js

const { Users } = require('../../models');
const { sendCmeReminderEmail } = require('./index');

async function sendCmeReminderJob() {
  const today = new Date();
  const month = today.getMonth(); // 0-based (Nov = 10)
  const day = today.getDate();

  // ✅ Run only on November 1
  if (month !== 10 || day !== 1) {
    return;
  }

  const currentYear = today.getFullYear();

  try {
    const users = await Users.findAll({
      where: {
        cme_year: currentYear,
        cme_reminder_sent_at: null,
      },
    });

    if (!users.length) return;

    // ✅ Only users under 50 CME credits
    const eligibleUsers = users.filter(user => user.cme_credits < 50);
    if (!eligibleUsers.length) return;

    // ✅ One email per user, fault-isolated
    for (const user of eligibleUsers) {
      try {
        await sendCmeReminderEmail(user);
        user.cme_reminder_sent_at = new Date();
        await user.save();
      } catch (err) {
        console.error(
          `❌ CME reminder failed for user ${user.id} (${user.email})`,
          err
        );
      }
    }

  } catch (err) {
    console.error('❌ CME Reminder Job failed:', err);
  }
}

module.exports = sendCmeReminderJob;


