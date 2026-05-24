import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setMsg("✅ " + data.message);

    } catch (error) {
      setMsg("❌ Upload failed");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎤 Speech to Text Upload</h1>

        <p style={styles.subtitle}>
          Upload your audio file to process speech-to-text
        </p>

        {/* Custom File Upload */}
        <label style={styles.fileLabel}>
          Choose Audio File
          <input
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        {/* Selected File Name */}
        {file && (
          <p style={styles.fileName}>
            Selected: {file.name}
          </p>
        )}

        {/* Upload Button */}
        <button onClick={uploadFile} style={styles.button}>
          {loading ? "Uploading..." : "Upload File"}
        </button>

        {/* Message */}
        {msg && <p style={styles.message}>{msg}</p>}
      </div>
    </div>
  );
}

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
    width: "350px",
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
    fontSize: "14px",
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
    transition: "0.3s",
  },

  message: {
    marginTop: "15px",
    color: "#22c55e",
  },
};

export default App;