const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require("path");

// Load env vars
dotenv.config();
connectDB();

const app = express();

// const allowedOrigins = [
//   'https://inventory.reliablesolution.in',
//   'http://localhost:3000' // for local testing
// ];

// Middleware
app.use(express.json()); // ✅ must come BEFORE routes
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", cors(), express.static(path.join(__dirname, "uploads")));

// Test route
app.get("/", (req, res) => {
  res.send("Inventory Backend is Live 🚀");
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


// Routes
app.use('/api/', require('./routes/indexRoute'));

// Cache control
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
