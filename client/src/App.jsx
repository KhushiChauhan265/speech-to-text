import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [speechText, setSpeechText] = useState("");

  // ---------------- UPLOAD (FIXED ONLY THIS PART) ----------------
  const uploadFile = async () => {
    if (!file) {
      setMsg("⚠️ Please select a file first");
      return;
    }

    setLoading(true);
    setMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.text) {
        setSpeechText(data.text);
        setMsg("✅ Transcription successful");
      } else {
        setMsg("❌ No text returned");
      }
    } catch (error) {
      setMsg("❌ Upload failed");
    }

    setLoading(false);
  };

  // ---------------- SPEECH (UNCHANGED) ----------------
  const startSpeech = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Chrome use kar");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setMsg("🎤 Speak NOW...");

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setSpeechText(transcript);
      setMsg("✅ Text captured");
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        setMsg("⚠️ No speech detected, try speaking immediately");
      } else {
        setMsg("❌ Error: " + event.error);
      }
    };

    setTimeout(() => {
      recognition.start();
    }, 300);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎤 Speech to Text Upload</h1>

        <p style={styles.subtitle}>
          Upload audio OR use speech recognition
        </p>

        {/* FILE UPLOAD */}
        <label style={styles.fileLabel}>
          Choose Audio File
          <input
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        {file && <p style={styles.fileName}>Selected: {file.name}</p>}

        <button onClick={uploadFile} style={styles.button}>
          {loading ? "Processing..." : "Upload File"}
        </button>

        {/* SPEECH BUTTON */}
        <button
          onClick={startSpeech}
          style={{ ...styles.button, marginTop: "10px", background: "#22c55e" }}
        >
          🎤 Start Speaking
        </button>

        {/* OUTPUT */}
        {speechText && (
          <div style={styles.speechBox}>
            <p>🧠 Speech Text:</p>
            <strong>{speechText}</strong>
          </div>
        )}

        {/* MESSAGE */}
        {msg && <p style={styles.message}>{msg}</p>}
      </div>
    </div>
  );
}

// ---------------- STYLES ----------------
const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
  },
  card: {
    background: "#1e293b",
    padding: "30px",
    borderRadius: "12px",
    textAlign: "center",
    width: "380px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
  },
  title: {
    color: "#fff",
    marginBottom: "10px",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "14px",
    marginBottom: "20px",
  },
  fileLabel: {
    display: "inline-block",
    background: "#334155",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "12px",
  },
  fileName: {
    color: "#cbd5e1",
    fontSize: "14px",
    marginBottom: "15px",
  },
  button: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },
  message: {
    marginTop: "15px",
    color: "#22c55e",
  },
  speechBox: {
    marginTop: "15px",
    padding: "10px",
    background: "#0f172a",
    borderRadius: "8px",
    color: "#fff",
  },
};

export default App;