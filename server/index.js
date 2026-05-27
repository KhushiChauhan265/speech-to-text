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

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    exec(`py transcribe.py "${filePath}"`, async (err, stdout) => {
      const text = stdout.trim();

      const saved = new Audio({
        filename: req.file.filename,
        filepath: filePath,
        transcription: text,
      });

      await saved.save();

      res.json({ success: true, text });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/transcriptions", async (req, res) => {
  const data = await Audio.find().sort({ uploadDate: -1 });
  res.json(data);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"));

app.listen(5000, () => console.log("Server running"));