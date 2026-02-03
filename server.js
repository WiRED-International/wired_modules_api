const app = require('./app');
const sequelize = require('./config/connection');
const port = process.env.PORT || 3000;
const cron = require('node-cron');
const sendCmeReminderJob = require('./services/email/sendCmeReminderJob');

sequelize.sync({ force: false })
  .then(() => {
    console.log('Database synced');

    app.listen(port, () => {
      console.log(`Now listening on: http://localhost:${port}`);

      // 🕒 Run CME reminder job once per day at 00:05
      cron.schedule('5 0 * * *', async () => {
        try {
          await sendCmeReminderJob();
        } catch (err) {
          console.error('❌ CME reminder cron failed:', err);
        }
      });
    });
  })
  .catch((err) => {
    console.error('Unable to sync database: ', err);
  });


