require("dotenv").config();
const express = require('express');
const app = express();
const auth = require('./middleware/auth');
const path = require("path");
const routes = require('./controllers/api/index');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional request logger (uncomment if needed)
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   console.log('Headers:', req.headers);
//   console.log('Body:', req.body);
//   next();
// });

app.use(routes);
app.use('/auth', auth);

// Serve static files for the React app
app.use(express.static(path.join(__dirname, "client-build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client-build", "index.html"));
});

module.exports = app;
