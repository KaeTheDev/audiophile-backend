import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false } // 👈 Add this line
});

app.get("/", (req, res) => {
    res.send("Audiophile API is running 🚀");
  });
  
// GET ALL PRODUCTS
app.get("/api/products", async(req, res) => {
    try {
        const result = await pool.query("SELECT * FROM products");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// GET SINGLE PRODUCT BY ID
app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query("SELECT * FROM products WHERE id=$1", [id]);
      if (result.rows.length === 0) return res.status(404).send("Product not found");
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  });

  // GET single product by slug
app.get("/api/products/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const result = await pool.query("SELECT * FROM products WHERE slug=$1", [slug]);
      if (result.rows.length === 0) return res.status(404).send("Product not found");
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  });

  // GET all products in a category
app.get("/api/products/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const result = await pool.query("SELECT * FROM products WHERE category=$1", [category]);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  });

  // POST /api/checkout
app.post("/api/checkout", async (req, res) => {
    const {
      name,
      email,
      phone,
      address,
      zip_code,
      city,
      country,
      payment_method,
      e_money_number,
      e_money_pin,
      items // [{ product_id, quantity, price }]
    } = req.body;
  
    try {
      // 1️⃣ Insert or get user
      const userResult = await pool.query(
        "INSERT INTO users (name, email, phone, address, zip_code, city, country) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [name, email, phone, address, zip_code, city, country]
      );
      const userId = userResult.rows[0].id;
  
      // 2️⃣ Insert order
      const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const orderResult = await pool.query(
        "INSERT INTO orders (user_id, total, payment_method, e_money_number, e_money_pin) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [userId, total, payment_method, e_money_number, e_money_pin]
      );
      const orderId = orderResult.rows[0].id;
  
      // 3️⃣ Insert order items
      for (const item of items) {
        await pool.query(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)",
          [orderId, item.product_id, item.quantity, item.price]
        );
      }
  
      res.json({ order_id: orderId, message: "Checkout successful" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
    }
  });
  
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));  