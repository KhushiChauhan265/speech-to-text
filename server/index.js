const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");
require("dotenv").config();

const Audio = require("./models/Audio");

const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(cors());
app.use(express.json());

// -------------------- CREATE UPLOADS FOLDER IF NOT EXISTS --------------------
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// -------------------- MULTER SETUP --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// -------------------- ROUTES --------------------

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running ");
});

// File upload route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    // Save file data to MongoDB
    const newAudio = new Audio({
      filename: req.file.filename,
      filepath: req.file.path,
    });

    await newAudio.save();

    console.log("Uploaded file:", req.file);

    res.status(200).json({
      message: "File uploaded successfully",
      file: newAudio,
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// -------------------- SERVER START --------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));
  
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});