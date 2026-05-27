const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema({
  filename: String,
  filepath: String,
  transcription: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Audio", audioSchema);