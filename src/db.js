// load mysql2 library and the .env file values into process.env
const mysql = require("mysql2/promise");
require("dotenv").config();

// create a pool of DB connections insteade of opening/closing one on every request
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = pool;
