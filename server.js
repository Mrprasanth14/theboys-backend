const express = require("express");
const path = require("path");
const db = require("./db.js");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("./cloudinary");

const app = express(); // ✅ MUST come before app.use
const frontendPath = path.join(__dirname, "../frontend");
// ✅ CORS setup
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// app.options("/*", cors()); // ✅ important

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* FILE UPLOAD */
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* ADD PRODUCT API */
app.post("/add-product", upload.single("image"), async (req, res) => {
  try {

    console.log("👉 BODY:", req.body);
    console.log("👉 FILE:", req.file);

    if (!req.file || !req.file.buffer) {
      return res.json({ success: false, message: "Image required" });
    }

    const streamifier = require("streamifier");

    const uploadFromBuffer = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    let imageUrl = "default.jpg";

    try {
      const result = await uploadFromBuffer();
      imageUrl = result.secure_url;
    } catch (error) {
      console.log("Cloudinary failed:", error);
    }

    const sql = `
      INSERT INTO products 
      (name, brand, price, original_price, category, description, image_url, collection, sizes, colors, rating) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
  name,
  brand,
  price,
  original_price || price, // ✅ fallback
  category,
  description,
  imageUrl, // ✅ correct
  collection,
  sizes,
  colors,
  4.5
], (err) => {
        if (err) {
          console.log("❌ DB ERROR:", err);
          return res.json({ success: false });
        }

        res.json({ success: true });
      }
    );

  } catch (err) {
    console.log("❌ UPLOAD ERROR:", err);
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

const sql = "SELECT * FROM custo WHERE email=? AND password=?";

db.query(sql, [email, password], (err, result) => {

if(err){
console.log(err);
return res.json({success:false});
}

if (result.length > 0) {
res.json({ success: true });
} else {
res.json({ success: false });
}

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
/* INSERT CUSTOMER DETAILS*/
/* SIGNUP */
app.post("/signup",(req,res)=>{

const {name,email,password,mobile} = req.body;

/* CHECK EMAIL FIRST */
const checkSql = "SELECT * FROM custo WHERE email=?";

db.query(checkSql,[email],(err,result)=>{

if(err){
console.log(err);
return res.json({success:false});
}

/* EMAIL ALREADY EXISTS */
if(result.length > 0){
return res.json({success:false,message:"exists"});
}

/* INSERT USER */
const insertSql =
"INSERT INTO custo (name,email,password,moblie) VALUES (?,?,?,?)";

db.query(insertSql,[name,email,password,mobile],(err,result)=>{

if(err){
console.log(err);
return res.json({success:false});
}

res.json({success:true});

});

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
//Delete products//
// DELETE PRODUCT
app.delete("/delete-product/:id", (req, res) => {

const productId = req.params.id;

const sql = "DELETE FROM products WHERE id=?";

db.query(sql, [productId], (err, result) => {

if(err){
console.log(err);
return res.json({success:false});
}

res.json({success:true});

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
app.get("/api/orders",(req,res)=>{

db.query("SELECT * FROM orders",(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

});

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});