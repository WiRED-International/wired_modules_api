const app = require('./app'); // ✅ Import the app instance
const sequelize = require('./config/connection');
const port = process.env.PORT || 3000;

sequelize.sync({ force: false })
  .then(() => {
    console.log('Database synced');
    app.listen(port, () => console.log(`Now listening on: http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('Unable to sync database: ', err);
  });

