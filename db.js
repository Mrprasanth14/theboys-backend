const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "switchback.proxy.rlwy.net",
  user: "root",
  password: "JQDglCjQQtJUGENvnnFBfwcWrUIRlvnl",
  database: "railway",
  port: 28741,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect((err) => {
  if (err) {
    console.log("❌ Database error:", err);
  } else {
    console.log("✅ Railway Database Connected");
  }
});

module.exports = db;