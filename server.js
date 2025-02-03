const express = require('express');
const app = express();
const sequelize = require('./config/connection');
const port = process.env.PORT || 3000;
const auth = require('./middleware/auth');

const routes = require('./controllers/api/index');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global middleware to log ALL incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.use(routes);

app.use('/auth', auth);

sequelize.sync({ force: false })
  .then(async() => {
    console.log('Database synced');
    app.listen(port, () => console.log('Now listening on: http://localhost:' + port)); 
  })
  .catch((err) => {
    console.error('Unable to sync database: ', err);
  });
