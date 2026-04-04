const express = require("express");
const path = require("path");
const db = require("./db.js");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("./cloudinary");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your_email@gmail.com",
    pass: "your_app_password" // NOT your normal password
  }
});

const app = express(); 
const frontendPath = path.join(__dirname, "../frontend");
app.use(cors()); // allow all origins

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* FILE UPLOAD */
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* ADD PRODUCT API */
app.post("/add-product", async (req, res) => {
  try {
    const {
  name,
  brand,
  price,
  original_price,
  category,
  description,
  collection,
  sizes,
  colors,
  image_url,
  shop_id 
} = req.body;

    if (!image_url) {
      return res.json({ success: false, message: "Image URL missing" });
    }

    const sql = `
      INSERT INTO products
      (name, brand, price, original_price, category, description, image_url, collection, sizes, colors, rating,shop_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

   db.query(sql, [
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
], (err) => {
      if (err) {
        console.log(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true });
    });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});
/* SERVE FRONTEND */
app.use(express.static(frontendPath));

/* HOME PAGE */
app.get("/", (req, res) => {
res.sendFile(path.join(frontendPath, "index.html"));
});

/* LOGIN */
app.post("/login", (req, res) => {

const { email, password } = req.body;

const sql = "SELECT * FROM custo WHERE email=?";

db.query(sql, [email], (err, result) => {

if(err){
console.log(err);
return res.json({success:false});
}

if(result.length === 0){
return res.json({success:false});
}

const user = result[0];

bcrypt.compare(password, user.password, (err, isMatch) => {

if(err){
console.log(err);
return res.json({success:false});
}

if(isMatch){
res.json({success:true});
}else{
res.json({success:false});
}

});

});

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
app.post("/admin-login",(req,res)=>{

const {email,password} = req.body;

const sql = "SELECT * FROM users WHERE email=? AND password=?";

db.query(sql,[email,password],(err,result)=>{

if(err){
console.log(err);
return res.json({success:false});
}

if(result.length>0){
res.json({success:true});
}else{
res.json({success:false});
}

});

});
/* SIGNUP */
app.post("/signup",(req,res)=>{

const {name,email,password,mobile} = req.body;

// ✅ VALIDATION
if(!name || !email || !password || !mobile){
  return res.json({success:false,message:"All fields required"});
}

// ✅ EMAIL FORMAT
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if(!emailRegex.test(email)){
  return res.json({success:false,message:"invalid_email"});
}

// ✅ PASSWORD RULE
if(password.length < 6){
  return res.json({success:false,message:"weak_password"});
}

// ✅ MOBILE RULE
if(!/^\d{10}$/.test(mobile)){
  return res.json({success:false,message:"invalid_mobile"});
}

/* CHECK EMAIL */
const checkSql = "SELECT * FROM custo WHERE email=?";

db.query(checkSql,[email],(err,result)=>{

  if(err){
    console.log(err);
    return res.json({success:false});
  }

  if(result.length > 0){
    return res.json({success:false,message:"exists"});
  }

  /* INSERT USER */
  const insertSql =
  "INSERT INTO custo (name,email,password,mobile) VALUES (?,?,?,?)";

  // 🔐 HASH PASSWORD
  bcrypt.hash(password, 10, (err, hashedPassword) => {

    if (err) {
      console.log(err);
      return res.json({ success: false });
    }

    db.query(insertSql,[name,email,hashedPassword,mobile],(err)=>{

      if(err){
        console.log(err);
        return res.json({success:false});
      }

      res.json({success:true});

    });

  });

}); // ✅ THIS WAS MISSING

}); // ✅ THIS ALSO CLOSES app.post
//api/shops//
app.get("/api/shops", (req, res) => {
  db.query("SELECT * FROM shops", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});
/* PRODUCTS API */

app.get("/api/products", (req, res) => {

  db.query("SELECT * FROM products", (err, result) => {

    if (err) {
      res.status(500).json(err);
    } else {
      res.json(result);
    }

  });

});
//shop_id//
app.get("/api/products/:shopId", (req, res) => {
  const shopId = req.params.shopId;

  const sql = "SELECT * FROM products WHERE shop_id = ?";

  db.query(sql, [shopId], (err, result) => {
    if (err) {
      console.log(err);
      return res.json([]);
    }

    res.json(result);
  });
});
//Delete products//
app.delete("/delete-product/:id", (req, res) => {
  const productId = req.params.id;

  if (!productId) {
    return res.status(400).json({ success: false, message: "Product ID required" });
  }

  const sql = "DELETE FROM products WHERE id = ?";

  db.query(sql, [productId], (err, result) => {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted successfully" });
  });
});
//Edit products//
// UPDATE PRODUCT
app.put("/update-product/:id", (req,res)=>{

const productId = req.params.id;

const {name,brand,price,category,description} = req.body;

const sql = `
UPDATE products 
SET name=?,brand=?,price=?,category=?,description=? 
WHERE id=?
`;

db.query(sql,[name,brand,price,category,description,productId],(err,result)=>{

if(err){
console.log(err);
return res.json({success:false});
}

res.json({success:true});

});

});
//orders//
// ======================
// GET ALL ORDERS (ADMIN)
// ======================
app.get("/api/orders", (req, res) => {
const sql = `
SELECT 
  o.id, o.total, o.status, o.date,
  oi.product_id, oi.quantity, oi.price,
  p.name, p.brand, p.image_url
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
`;
  db.query(sql, (err, result) => {

    if (err) return res.status(500).json(err);

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
  image: row.image_url // ✅ IMPORTANT
  });
}
    });

    res.json(Object.values(orders));
  });
});
//api create order//
app.post("/api/create-order", (req, res) => {
  const { items, total } = req.body;

  console.log("👉 Incoming items:", items);

  db.query(
    "INSERT INTO orders (total, status) VALUES (?, ?)",
    [total, "Pending"],
    (err, orderResult) => {
      if (err) {
        console.log("Order error:", err);
        return res.status(500).json({ success: false });
      }

      const orderId = orderResult.insertId;

      const values = items.map(item => [
        orderId,
        item.product_id,
        item.quantity,
        item.price
      ]);

      console.log("👉 Insert values:", values);

      db.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
        [values],
        (err2) => {
          if (err2) {
            console.log("❌ Item insert error:", err2);
            return res.status(500).json({ success: false });
          }

          res.json({ success: true });
        }
      );
    }
  );
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
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});