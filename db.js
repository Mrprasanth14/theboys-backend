require("dotenv").config();
const mysql = require("mysql2/promise");
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

// ✅ Test connection
(async () => {
  try {
    const conn = await db.getConnection();
    console.log("✅ DB Connected (Pool - Railway)");
    conn.release();
  } catch (err) {
    console.log("❌ DB ERROR:", err);
  }
})();

module.exports = db;