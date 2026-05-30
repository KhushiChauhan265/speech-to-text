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
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;//initialized
const FRONTEND_URL = process.env.FRONTEND_URL || "https://speech-to-text-five-delta.vercel.app";

console.log("ASSEMBLYAI_API_KEY exists:", !!ASSEMBLYAI_API_KEY);
console.log("MONGO_URI exists:", !!MONGO_URI);
console.log("FRONTEND_URL:", FRONTEND_URL);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin === FRONTEND_URL || origin === "http://localhost:5173") {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
  })
);

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

const Audio = mongoose.models.Audio || mongoose.model("Audio", AudioSchema);

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
  } catch (err) {
    console.log("File delete warning:", err?.message);
  }
};

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Speech-to-text backend running" });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mongoConnected: mongoose.connection.readyState === 1,
    hasAssemblyKey: !!ASSEMBLYAI_API_KEY,
    frontendUrl: FRONTEND_URL,
  });
});

app.get("/live-token", async (_req, res) => {
  try {
    if (!ASSEMBLYAI_API_KEY) {
      return res.status(500).json({
        error: "ASSEMBLYAI_API_KEY is missing",
      });
    }

    const tokenRes = await axios.get(
      "https://streaming.assemblyai.com/v3/token",
      {
        params: {
          expires_in_seconds: 300,
        },
        headers: {
          Authorization: ASSEMBLYAI_API_KEY,
        },
        timeout: 20000,
      }
    );

    return res.json({
      token: tokenRes.data.token,
    });
  } catch (err) {
    console.log(
      "LIVE TOKEN ERROR FULL:",
      err?.response?.data || err?.message || err
    );

    return res.status(500).json({
      error:
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
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

    if (!ASSEMBLYAI_API_KEY) {
      await safeDeleteFile(req.file.path);
      return res.status(500).json({ error: "ASSEMBLYAI_API_KEY is missing" });
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
        timeout: 60000,
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
        timeout: 20000,
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
          timeout: 20000,
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

    return res.json({
      success: true,
      text,
      audio: savedAudio,
    });
  } catch (err) {
    console.log("TRANSCRIBE ERROR FULL:", err?.response?.data || err?.message || err);
    await safeDeleteFile(filePath);

    return res.status(500).json({
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
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const data = await Audio.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    return res.json(data);
  } catch (err) {
    console.log("HISTORY ERROR FULL:", err);
    return res.status(500).json({
      error: err?.message || "Failed to fetch history",
    });
  }
});

app.use((err, _req, res, _next) => {
  console.log("GLOBAL ERROR:", err?.response?.data || err?.message || err);

  return res.status(500).json({
    error: err?.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});