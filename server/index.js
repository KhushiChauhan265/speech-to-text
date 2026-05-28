const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");
const { exec } = require("child_process");
require("dotenv").config();

const Audio = require("./models/Audio");

const app = express();

app.use(cors());
app.use(express.json());

// ---------------- UPLOAD FOLDER ----------------
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ---------------- MULTER ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),

  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// ---------------- HISTORY ----------------
app.get("/history/:userId", async (req, res) => {
  try {
    console.log("Fetching history for:", req.params.userId);

    const audios = await Audio.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });

    res.json(audios);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Failed to fetch history",
    });
  }
});

// ---------------- TRANSCRIBE ----------------
app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const filePath = req.file.path;

    const userId = req.body.userId;

    console.log("USER ID:", userId);

    if (!userId) {
      return res.status(400).json({
        error: "User ID missing",
      });
    }

    exec(`py transcribe.py "${filePath}"`, async (err, stdout) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          error: "Python transcription failed",
        });
      }

      const text = stdout.trim();

      console.log("TRANSCRIBED:", text);

      const saved = new Audio({
        filename: req.file.filename,
        filepath: filePath,
        transcription: text,
        userId,
      });

      await saved.save();

      console.log("Saved to MongoDB");

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

// ---------------- MONGO ----------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

app.listen(5000, () =>
  console.log("Server running on port 5000")
);