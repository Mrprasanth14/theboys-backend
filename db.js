require("dotenv").config();
const mysql = require("mysql2");

// ✅ USE POOL (IMPORTANT FIX)
const db = mysql.createPool({
  host: "switchback.proxy.rlwy.net",
  user: "root",
  password: "JQDglCjQQtJUGENvnnFBfwcWrUIRlvnl",
  database: "railway",
  port: 28741,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// optional debug
db.getConnection((err, connection) => {
  if (err) {
    console.log("❌ DB ERROR:", err);
  } else {
    console.log("✅ DB Connected (Pool - Railway)");
    connection.release(); // VERY IMPORTANT
  }
});

module.exports = db;