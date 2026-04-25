const express = require("express");
const path = require("path");
const db = require("./db.js");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("./cloudinary");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");


const SECRET_KEY = "mysecretkey"; // 🔐 change 

function verifyToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
}

///create //
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your_email@gmail.com",
    pass: "your_app_password" // NOT your normal password
  }
});

const app = express(); 
// const frontendPath = path.join(__dirname, "../frontend");
app.use(cors({
  origin: "https://theboys-frontend.vercel.app",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

/* FILE UPLOAD */
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* ADD PRODUCT API */
app.post("/add-product", async (req, res) => {
  try {
    const {
      name, brand, price, original_price,
      category, description, collection,
      sizes, colors, image_url, shop_id
    } = req.body;

    const sql = `
      INSERT INTO products
      (name, brand, price, original_price, category, description, image_url, collection, sizes, colors, rating, shop_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      name,
      brand,
      price,
      original_price || price,
      category,
      description,
      image_url,
      collection,
      sizes,
      colors,
      4.5,
      shop_id
    ]);

    res.json({ success: true });

  } catch (err) {
    console.log("❌ ADD PRODUCT ERROR:", err);
    res.json({ success: false });
  }
});
/* SERVE FRONTEND */
// app.use(express.static(frontendPath));

// /* HOME PAGE */
// app.get("/", (req, res) => {
// res.sendFile(path.join(frontendPath, "index.html"));
// });

/* LOGIN */
app.post("/api/login", async (req, res) => {
  console.log("👉 Login API hit");

  const { email, password } = req.body;

  try {
    const [users] = await db.query(
      "SELECT * FROM custo WHERE email=?",
      [email]
    );

    console.log("👉 DB result:", users);

    if (users.length === 0) {
      return res.json({ success: false, message: "invalid_email" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("👉 Password match:", isMatch);

    if (!isMatch) {
      return res.json({ success: false, message: "wrong_password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: "user" },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    console.log("✅ Login success");
    res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 24 * 60 * 60 * 1000
});

return res.json({ success: true });

  } catch (err) {
    console.log("❌ LOGIN ERROR:", err);
    return res.json({ success: false });
  }
});
//forget pass//
app.post("/forgot-password", (req, res) => {

const { email } = req.body;

// 1️⃣ Generate secure token
const token = crypto.randomBytes(32).toString("hex");

// 2️⃣ Hash token before saving
const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

// 3️⃣ Expiry (1 hour)
const expiry = new Date(Date.now() + 3600000);

// 4️⃣ Save to DB
const sql = "UPDATE custo SET reset_token=?, reset_expiry=? WHERE email=?";

db.query(sql, [hashedToken, expiry, email], (err, result) => {

if(err){
console.log(err);
return res.json({success:false});
}

// 5️⃣ Send email
const link = `http://localhost:3000/reset.html?token=${token}`;

const mailOptions = {
  from: "your_email@gmail.com",
  to: email,
  subject: "Reset Password",
  html: `<h3>Reset your password</h3>
         <a href="${link}">Click here</a>`
};

transporter.sendMail(mailOptions, (err) => {

if(err){
console.log(err);
return res.json({success:false});
}

res.json({success:true});

});

});

});
//reset pass//
app.post("/reset-password", (req, res) => {

const { token, newPassword } = req.body;

// 1️⃣ Hash token to compare
const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

// 2️⃣ Find valid token
const sql = `
SELECT * FROM custo 
WHERE reset_token=? AND reset_expiry > NOW()
`;

db.query(sql, [hashedToken], (err, result) => {

if(err || result.length === 0){
return res.json({success:false});
}

// 3️⃣ Hash new password
bcrypt.hash(newPassword, 10, (err, hashedPassword) => {

if(err){
return res.json({success:false});
}

// 4️⃣ Update password
const updateSql = `
UPDATE custo 
SET password=?, reset_token=NULL, reset_expiry=NULL 
WHERE reset_token=?
`;

db.query(updateSql, [hashedPassword, hashedToken], (err) => {

if(err){
return res.json({success:false});
}

res.json({success:true});

});

});

});

});
//ADMIN LOGIN//
app.post("/admin-login", async (req, res) => {
  console.log("👉 Admin Login API hit");

  const { email, password } = req.body;

  try {
    const [result] = await db.query(
      "SELECT * FROM adminuser WHERE email=?",
      [email]
    );

    if (result.length === 0) {
      return res.json({ success: false, message: "invalid_email" });
    }

    const user = result[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.json({ success: false, message: "wrong_password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: "admin" },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    console.log("✅ Admin login success");

    return res.json({
      success: true,
      token: token
    });

  } catch (err) {
    console.log("❌ ADMIN LOGIN ERROR:", err);
    return res.json({ success: false });
  }
});
//adminsignup//

app.post("/admin-signup", async (req, res) => {
  console.log("👉 Signup API HIT");

  const { name, email, password } = req.body;

  try {
    const [existing] = await db.query(
      "SELECT * FROM adminuser WHERE email=?",
      [email]
    );

    if (existing.length > 0) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO adminuser (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    console.log("✅ Inserted:", result);

    return res.json({ success: true });

  } catch (err) {
    console.log("❌ SIGNUP ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});
/* SIGNUP */
app.post("/api/signup", async (req, res) => {
  console.log("👉 Signup API hit");

  const { name, email, password, mobile } = req.body;

  try {
    // ✅ validation
    if (!name || !email || !password || !mobile) {
      return res.json({ success: false, message: "All fields required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ success: false, message: "invalid_email" });
    }

    if (password.length < 6) {
      return res.json({ success: false, message: "weak_password" });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.json({ success: false, message: "invalid_mobile" });
    }

    // ✅ check existing user
    const [users] = await db.query(
      "SELECT * FROM custo WHERE email=?",
      [email]
    );

    if (users.length > 0) {
      return res.json({ success: false, message: "exists" });
    }

    // ✅ hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ insert user
    await db.query(
      "INSERT INTO custo (name,email,password,mobile) VALUES (?,?,?,?)",
      [name, email, hashedPassword, mobile]
    );

    console.log("✅ User inserted");

    // ✅ VERY IMPORTANT (this was missing in your flow)
    return res.json({ success: true });

  } catch (err) {
    console.log("❌ ERROR:", err);
    return res.json({ success: false });
  }
});
/* PRODUCTS API */
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products");
    res.json(rows);
  } catch (err) {
    console.log("❌ DB ERROR:", err);
    res.status(500).json({ error: "Error loading products" });
  }
});
//shop_id//
app.get("/api/products/:shopId", async (req, res) => {
  const shopId = req.params.shopId;

  try {
    const [rows] = await db.query(
      "SELECT * FROM products WHERE shop_id = ?",
      [shopId]
    );

    res.json(rows);

  } catch (err) {
    console.log(err);
    res.json([]);
  }
});
//Delete products//
app.delete("/delete-product/:id", verifyToken, async (req, res) => {
  try {
    const productId = req.params.id;

    const [result] = await db.query(
      "DELETE FROM products WHERE id = ?",
      [productId]
    );

    if (result.affectedRows === 0) {
      return res.json({ success: false });
    }

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});
// UPDATE PRODUCT
app.put("/update-product/:id", verifyToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, brand, price, category, description } = req.body;

    await db.query(
      `UPDATE products SET name=?, brand=?, price=?, category=?, description=? WHERE id=?`,
      [name, brand, price, category, description, productId]
    );

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});
//orders//
// ======================
// GET ALL ORDERS (ADMIN)
// ======================
app.get("/api/orders", async (req, res) => {
  const sql = `
  SELECT 
    o.id, o.total, o.status, o.date,
    oi.product_id, oi.quantity, oi.price,
    p.name, p.brand, p.image_url
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN products p ON oi.product_id = p.id
  `;

  try {
    const [result] = await db.query(sql);

    const orders = {};

    result.forEach(row => {
      if (!orders[row.id]) {
        orders[row.id] = {
          id: row.id,
          total: row.total,
          status: row.status,
          date: row.date,
          items: []
        };
      }

      if (row.product_id) {
        orders[row.id].items.push({
          product_id: row.product_id,
          quantity: row.quantity,
          price: row.price,
          name: row.name,
          brand: row.brand,
          image: row.image_url
        });
      }
    });

    res.json(Object.values(orders));

  } catch (err) {
    console.log("❌ DB ERROR:", err);
    res.status(500).json({ error: "Server error loading orders" });
  }
});
//api shops//
app.get("/api/shops", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM shops");
    res.json(rows);
  } catch (err) {
    console.log("❌ SHOPS ERROR:", err.message); // 👈 IMPORTANT
    res.status(500).json({ error: err.message });
  }
});
//api create order//
app.post("/api/create-order", async (req, res) => {
  const { items, total } = req.body;

  try {
    // ✅ Insert order
    const [orderResult] = await db.query(
      "INSERT INTO orders (total, status) VALUES (?, ?)",
      [total, "Pending"]
    );

    const orderId = orderResult.insertId;

    // ✅ Prepare items
    const values = items.map(item => [
      orderId,
      item.product_id,
      item.quantity,
      item.price
    ]);

    // ✅ Insert order items
    await db.query(
      "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
      [values]
    );

    res.json({ success: true });

  } catch (err) {
    console.log("❌ CREATE ORDER ERROR:", err);
    res.status(500).json({ success: false });
  }
});
// api-card-add//
app.post("/api/cart/add", (req, res) => {
  const { productId, quantity } = req.body;

  db.query(
    "INSERT INTO cart (product_id, quantity) VALUES (?, ?)",
    [productId, quantity],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send({ success: true });
    }
  );
});
//invoice//
app.get("/api/orders/:id/invoice", (req, res) => {
  const orderId = req.params.id;

  db.query("SELECT * FROM orders WHERE id = ?", [orderId], (err, order) => {
    if (err) return res.send("Error");

    const invoice = `
      <h1>Invoice</h1>
      <p>Order ID: ${orderId}</p>
      <p>Total: ₹${order[0].total}</p>
    `;

    res.send(invoice);
  });
});
//api/orders//
app.get("/api/orders/:id", (req, res) => {
  const id = req.params.id;

  db.query("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
    if (err) return res.status(500).send(err);

    // ✅ IMPORTANT FIX
    if (!order || order.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    db.query(
      "SELECT * FROM order_items WHERE order_id = ?",
      [id],
      (err, items) => {
        if (err) return res.status(500).send(err);

        order[0].items = items;
        res.json(order[0]);
      }
    );
  });
});
//apiorderw/id/stauts//
app.put("/api/orders/:id/status", (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const sql = "UPDATE orders SET status = ? WHERE id = ?";

  db.query(sql, [status, orderId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "DB error" });
    }

    res.json({ message: "Status updated" });
  });
});
///sear api//
app.get("/api/search", (req, res) => {

  const { q, category, minPrice, maxPrice, rating, sort } = req.query;

  let sql = "SELECT * FROM products WHERE 1=1";
  let values = [];

  // 🔍 Search
  if (q) {
    sql += " AND (name LIKE ? OR brand LIKE ?)";
    values.push(`%${q}%`, `%${q}%`);
  }

  // 📂 Category
  if (category) {
    sql += " AND category = ?";
    values.push(category);
  }

  // 💰 Price
  if (minPrice && maxPrice) {
    sql += " AND price BETWEEN ? AND ?";
    values.push(minPrice, maxPrice);
  }

  // ⭐ Rating
  if (rating) {
    sql += " AND rating >= ?";
    values.push(rating);
  }

  // 🔃 Sorting
  if (sort === "price-low") sql += " ORDER BY price ASC";
  if (sort === "price-high") sql += " ORDER BY price DESC";
  if (sort === "rating") sql += " ORDER BY rating DESC";
  if (sort === "newest") sql += " ORDER BY id DESC";

  db.query(sql, values, (err, result) => {
    if (err) {
      console.log(err);
      return res.json([]);
    }

    res.json(result);
  });

});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});