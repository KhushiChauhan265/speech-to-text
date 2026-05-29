import express from "express";
import multer from "multer";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("/{*any}", cors(corsOptions));
app.use(express.json());

if (!MONGO_URI) {
  console.log("MONGO_URI is missing in environment variables");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log("Mongo Error:", err.message));
}

const AudioSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    filename: { type: String, required: true },
    transcription: { type: String, required: true },
  },
  { timestamps: true }
);

const Audio = mongoose.model("Audio", AudioSchema);

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files are allowed"));
    }
    cb(null, true);
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeDeleteFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {}
};

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Speech-to-text backend running" });
});

app.get("/live-token", async (_req, res) => {
  try {
    const tokenRes = await axios.get("https://streaming.assemblyai.com/v3/token", {
      headers: {
        Authorization: ASSEMBLYAI_API_KEY,
      },
      params: {
        expires_in_seconds: 300,
      },
    });

    res.json({
      token: tokenRes.data.token,
      expires_in_seconds: 300,
    });
  } catch (err) {
    console.log("LIVE TOKEN ERROR:", err?.response?.data || err?.message);
    res.status(500).json({
      error:
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate live token",
    });
  }
});

app.post("/transcribe", upload.single("file"), async (req, res) => {
  let filePath = "";

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    if (!req.body.userId) {
      await safeDeleteFile(req.file.path);
      return res.status(400).json({ error: "Missing userId" });
    }

    filePath = req.file.path;
    const audioFile = await fs.promises.readFile(filePath);

    const uploadRes = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      audioFile,
      {
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          "content-type": "application/octet-stream",
        },
        maxBodyLength: Infinity,
      }
    );

    const audioUrl = uploadRes?.data?.upload_url;
    if (!audioUrl) {
      throw new Error("AssemblyAI upload failed");
    }

    const transcriptRes = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url: audioUrl,
        speech_model: "universal",
        language_detection: true,
      },
      {
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    const transcriptId = transcriptRes?.data?.id;
    if (!transcriptId) {
      throw new Error("Failed to start transcription");
    }

    let text = "";
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      attempts++;

      const polling = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            authorization: ASSEMBLYAI_API_KEY,
          },
        }
      );

      const status = polling?.data?.status;

      if (status === "completed") {
        text = polling?.data?.text || "";
        break;
      }

      if (status === "error") {
        throw new Error(polling?.data?.error || "AssemblyAI transcription failed");
      }

      await sleep(3000);
    }

    if (!text) {
      throw new Error("Transcription timeout");
    }

    const savedAudio = await Audio.create({
      userId: req.body.userId,
      filename: req.file.originalname || "audio-file",
      transcription: text,
    });

    await safeDeleteFile(filePath);

    res.json({
      success: true,
      text,
      audio: savedAudio,
    });
  } catch (err) {
    console.log("TRANSCRIBE ERROR:", err?.response?.data || err?.message);
    await safeDeleteFile(filePath);

    res.status(500).json({
      error:
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Transcription failed",
    });
  }
});

app.get("/history/:userId", async (req, res) => {
  try {
    console.log("History requested for userId:", req.params.userId);

    const data = await Audio.find({ userId: req.params.userId }).sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    console.log("HISTORY ERROR:", err?.message || err);
    res.status(500).json({
      error: err?.message || "Failed to fetch history",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});