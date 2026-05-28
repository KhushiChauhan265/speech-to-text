const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema({
  filename: String,

  filepath: String,

  transcription: String,

  userId: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Audio", audioSchema);