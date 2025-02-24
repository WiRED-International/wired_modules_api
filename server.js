require("dotenv").config();
const express = require('express');
const cors = require('cors');
const app = express();
const sequelize = require('./config/connection');
const port = process.env.PORT || 3000;
const auth = require('./middleware/auth');
const path = require("path");

const routes = require('./controllers/api/index');

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : [];

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming request from origin:`, req.headers.origin);
  console.log(`Request Method: ${req.method}`);
  console.log(`Request URL: ${req.url}`);
  console.log(`Request Headers:`, req.headers);
  next();
});

app.use(cors({
  origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin === "null") {
          callback(null, true);
      } else {
          callback(new Error("Not allowed by CORS"));
      }
  },
  methods: ["GET", "POST", "PUT", "DELETE"], 
  allowedHeaders: ["Content-Type", "Authorization"] 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global middleware to log ALL incoming requests
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   console.log('Headers:', req.headers);
//   console.log('Body:', req.body);
//   next();
// });

app.use(routes);

app.use('/auth', auth);

//serve the static files from the React app
app.use(express.static(path.join(__dirname, "client-build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client-build", "index.html"));
});

sequelize.sync({ force: false })
  .then(async() => {
    console.log('Database synced');
    app.listen(port, () => console.log('Now listening on: http://localhost:' + port)); 
  })
  .catch((err) => {
    console.error('Unable to sync database: ', err);
  });
