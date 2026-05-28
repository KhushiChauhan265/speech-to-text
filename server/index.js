const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");
const { exec } = require("child_process");
require("dotenv").config();

const Audio = require("./models/Audio");

const app = express();

// ---------------- CORS ----------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-frontend.vercel.app",
      "https://your-frontend.netlify.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

// ---------------- CREATE UPLOADS FOLDER ----------------
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

// ---------------- HISTORY API ----------------
app.get("/history/:userId", async (req, res) => {
  try {
    const audios = await Audio.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });

    res.json(audios);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ---------------- TRANSCRIBE API ----------------
app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID missing" });
    }

    exec(`python3 transcribe.py "${filePath}"`, async (err, stdout) => {
      if (err) {
        console.log("Python error:", err);
        return res.status(500).json({
          error: "Transcription failed",
        });
      }

      const text = stdout.trim();

      const saved = new Audio({
        filename: req.file.filename,
        filepath: filePath,
        transcription: text,
        userId,
      });

      await saved.save();

      res.json({
        success: true,
        text,
      });
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
});

// ---------------- MONGODB ----------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});