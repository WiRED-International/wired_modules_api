const express = require('express');
const app = express();
const mysql = require('mysql2');
const sequelize = require('./config/connection');
const port = process.env.PORT || 3000;
require('dotenv').config();

const db = require('./config/connection');

// db.connect((err) => {
//     if (err) {
//         console.error('error connecting ot MySQL: ' + err.stack);
//         return;
//     }
//     console.log('Connected to MySQL ' + db.threadId);
// });

// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });

// app.get('/modules', (req, res) => {
//     db.query('SELECT * FROM modules', (err, results) => {
//         if (err) {
//             console.error('error running query: ' + err.stack);
//             return;
//         }
//         res.json(results);
//     });
// });

sequelize.sync({ force: false }).then(() => {
    console.log('Database synced');
    app.listen(port, () => console.log('Now listening on: http://localhost:' + port)); 
  })
  .catch((err) => {
    console.error('Unable to sync database: ', err);
  });