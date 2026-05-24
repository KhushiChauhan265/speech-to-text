const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");
const { exec } = require("child_process");
require("dotenv").config();

const Audio = require("./models/Audio");

const app = express();

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());

// ---------------- UPLOAD FOLDER ----------------
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ---------------- MULTER ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ---------------- TEST ROUTE ----------------
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// =====================================================
// 🔥 1. FILE UPLOAD (MongoDB save only)
// =====================================================
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const newAudio = new Audio({
      filename: req.file.filename,
      filepath: req.file.path,
      transcript: "",
    });

    await newAudio.save();

    res.json({
      message: "File uploaded successfully",
      file: newAudio,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// =====================================================
// 🔥 2. AUDIO FILE → TEXT (WHISPER LOCAL)
// =====================================================
app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file uploaded" });
    }

    const filePath = req.file.path;

    exec(`python transcribe.py ${filePath}`, async (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const text = stdout.trim();

      // save to MongoDB
      const saved = new Audio({
        filename: req.file.filename,
        filepath: filePath,
        transcript: text,
      });

      await saved.save();

      res.json({
        success: true,
        text: text,
      });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ---------------- SAVE TEXT (mic speech) ----------------
app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file uploaded" });
    }

    const filePath = req.file.path;

    console.log("FILE PATH:", filePath);

    exec(`py transcribe.py "${filePath}"`, async (err, stdout, stderr) => {
      if (err) {
        console.log("ERROR:", err);
        console.log("STDERR:", stderr);
        return res.status(500).json({ error: err.message });
      }

      const text = stdout.trim();

      const saved = new Audio({
        filename: req.file.filename,
        filepath: filePath,
        transcript: text,
      });

      await saved.save();

      res.json({
        success: true,
        text: text,
      });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- MONGODB ----------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});