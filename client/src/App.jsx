import { useState, useRef, useEffect } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const [recording, setRecording] = useState(false);

  // NEW STATE FOR HISTORY
  const [history, setHistory] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ---------------- FETCH HISTORY ----------------
  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:5000/transcriptions");

      const data = await res.json();

      setHistory(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ---------------- COMMON API FUNCTION ----------------
  const sendAudioToBackend = async (audioFile) => {
    const formData = new FormData();
    formData.append("file", audioFile);

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.text) {
        setSpeechText(data.text);
        setMsg("✅ Transcription successful");

        // REFRESH HISTORY
        fetchHistory();
      } else {
        setMsg("❌ No transcription returned");
      }
    } catch (error) {
      console.error(error);
      setMsg("❌ Backend connection failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FILE UPLOAD ----------------
  const uploadFile = async () => {
    if (!file) {
      setMsg("⚠️ Please select a file first");
      return;
    }

    await sendAudioToBackend(file);
  };

  // ---------------- MEDIA RECORDER ----------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const audioFile = new File([audioBlob], "recording.webm", {
          type: "audio/webm",
        });

        await sendAudioToBackend(audioFile);
      };

      mediaRecorder.start();

      setRecording(true);
      setMsg("🎤 Recording started...");
    } catch (error) {
      console.error(error);
      setMsg("❌ Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
    setMsg("⏹️ Recording stopped");
  };

  // ---------------- SPEECH RECOGNITION ----------------
  const startSpeech = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Please use Google Chrome");
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
        setMsg("⚠️ No speech detected");
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

        {/* FILE INPUT */}
        <label style={styles.fileLabel}>
          Choose Audio File
          <input
            type="file"
            hidden
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        {file && (
          <p style={styles.fileName}>
            Selected: {file.name}
          </p>
        )}

        {/* FILE UPLOAD BUTTON */}
        <button
          onClick={uploadFile}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
        >
          {loading ? "Processing..." : "Upload File"}
        </button>

        {/* RECORDING */}
        {!recording ? (
          <button
            onClick={startRecording}
            disabled={loading}
            style={{
              ...styles.button,
              marginTop: "10px",
              background: "#f59e0b",
              opacity: loading ? 0.7 : 1,
            }}
          >
            🎙️ Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{
              ...styles.button,
              marginTop: "10px",
              background: "#ef4444",
            }}
          >
            ⏹️ Stop Recording
          </button>
        )}

        {/* SPEECH BUTTON */}
        <button
          onClick={startSpeech}
          disabled={loading}
          style={{
            ...styles.button,
            marginTop: "10px",
            background: "#22c55e",
            opacity: loading ? 0.7 : 1,
          }}
        >
          🎤 Start Speaking
        </button>

        {/* LOADING */}
        {loading && (
          <p style={styles.loadingText}>
            ⏳ Please wait, generating transcription...
          </p>
        )}

        {/* OUTPUT */}
        {speechText && (
          <div style={styles.speechBox}>
            <p>🧠 Speech Text:</p>
            <strong>{speechText}</strong>
          </div>
        )}

        {/* MESSAGE */}
        {msg && <p style={styles.message}>{msg}</p>}

        {/* HISTORY SECTION */}
        {history.length > 0 && (
          <div style={styles.historyContainer}>
            <h2 style={styles.historyTitle}>
              📜 Previous Transcriptions
            </h2>

            {history.map((item) => (
              <div key={item._id} style={styles.historyCard}>
                <p style={styles.historyFile}>
                  🎵 {item.filename}
                </p>

                <p style={styles.historyText}>
                  {item.transcription}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- STYLES ----------------
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
    padding: "20px",
  },

  card: {
    background: "#1e293b",
    padding: "30px",
    borderRadius: "12px",
    textAlign: "center",
    width: "420px",
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
    transition: "0.2s",
  },

  message: {
    marginTop: "15px",
    color: "#22c55e",
  },

  loadingText: {
    marginTop: "12px",
    color: "#facc15",
    fontSize: "14px",
  },

  speechBox: {
    marginTop: "15px",
    padding: "10px",
    background: "#0f172a",
    borderRadius: "8px",
    color: "#fff",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    textAlign: "left",
    maxHeight: "250px",
    overflowY: "auto",
  },

  // HISTORY
  historyContainer: {
    marginTop: "25px",
    textAlign: "left",
  },

  historyTitle: {
    color: "#fff",
    marginBottom: "15px",
    fontSize: "20px",
  },

  historyCard: {
    background: "#0f172a",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "12px",
  },

  historyFile: {
    color: "#38bdf8",
    fontSize: "14px",
    marginBottom: "8px",
  },

  historyText: {
    color: "#fff",
    fontSize: "14px",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
};

export default App;