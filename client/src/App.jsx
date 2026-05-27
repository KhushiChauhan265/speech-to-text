import { useState, useRef, useEffect } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const [history, setHistory] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // ---------------- HISTORY ----------------
  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:5000/transcriptions");
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ---------------- UPLOAD ----------------
  const sendAudio = async (audioFile) => {
    const formData = new FormData();
    formData.append("file", audioFile);

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.text) {
        setSpeechText(data.text);
        setMsg("✅ Transcription completed");
        fetchHistory();
      } else {
        setMsg("❌ No text returned");
      }
    } catch (err) {
      setMsg("❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!file) return setMsg("⚠️ Please select a file first");
    await sendAudio(file);
  };

  // ---------------- RECORDING ----------------
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "recording.webm", {
        type: "audio/webm",
      });

      await sendAudio(file);
    };

    mediaRecorder.start();
    setRecording(true);
    setMsg("🎤 Recording...");

    setRecordTime(0);
    timerRef.current = setInterval(() => {
      setRecordTime((t) => t + 1);
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
    setMsg("⏹ Recording stopped");
  };

  // ---------------- SPEECH TOGGLE ----------------
  const toggleSpeech = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return alert("Use Chrome");

    if (isSpeaking) {
      recognitionRef.current?.stop();
      setIsSpeaking(false);
      setMsg("⏹ Speech stopped");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = "";

    setIsSpeaking(true);
    setMsg("🎤 Listening...");

    recognition.onresult = (event) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += text + " ";
        } else {
          interim += text;
        }
      }

      setSpeechText(finalText + interim);
    };

    recognition.onerror = () => {
      setIsSpeaking(false);
      setMsg("❌ Speech error");
    };

    recognition.onend = () => {
      setIsSpeaking(false);
    };

    recognition.start();
  };

  // ---------------- UTIL ----------------
  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setMsg("📋 Copied!");
  };

  const downloadText = (text, name) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.txt`;
    a.click();
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
      s % 60
    ).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <div className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-3xl font-extrabold text-purple-400 tracking-wide">
          🎤 Speech To Text
        </h1>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* LOADING */}
        {loading && (
          <div className="mb-4 flex items-center gap-2 text-yellow-400">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            Processing audio...
          </div>
        )}

        {/* MESSAGE */}
        {!loading && msg && (
          <div className="mb-3 text-sm text-green-400">
            {msg}
          </div>
        )}

        {/* RESULT */}
        {speechText && (
          <div className="bg-slate-900 p-4 rounded-xl mb-6 hover:bg-slate-800 transition">
            <p className="text-gray-400 text-sm mb-2">
              Transcribed Text
            </p>
            <p>{speechText}</p>
          </div>
        )}

        {/* UPLOAD */}
        <label className="border-2 border-dashed border-purple-600 rounded-2xl p-10 flex flex-col items-center cursor-pointer hover:bg-slate-900 transition">
          <p className="text-gray-300">Drag & drop audio file</p>
          <input
            type="file"
            hidden
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        {file && (
          <p className="text-sm text-gray-400 mt-2">
            Selected: {file.name}
          </p>
        )}

        <button
          onClick={uploadFile}
          className="w-full mt-4 bg-purple-600 py-3 rounded-xl hover:bg-purple-700 transition"
        >
          Upload Audio
        </button>

        {/* ACTIONS */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <button
            onClick={startRecording}
            className="bg-slate-900 py-4 rounded-xl hover:scale-105 transition"
          >
            🎙️ Record
          </button>

          <button
            onClick={toggleSpeech}
            className={`py-4 rounded-xl hover:scale-105 transition ${
              isSpeaking ? "bg-red-600" : "bg-slate-900"
            }`}
          >
            {isSpeaking ? "⏹ Stop Speaking" : "🎤 Speak Live"}
          </button>
        </div>

        {/* TIMER */}
        {recording && (
          <div className="mt-4 text-red-400 flex gap-3 items-center">
            ⏺ {formatTime(recordTime)}
            <button
              onClick={stopRecording}
              className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition"
            >
              Stop
            </button>
          </div>
        )}

        {/* HISTORY */}
        <div className="mt-10">
          <h2 className="text-xl mb-3">History</h2>

          <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
            {history.map((item) => (
              <div
                key={item._id}
                className="bg-slate-900 p-4 rounded-xl hover:bg-slate-800 transition"
              >
                <p className="text-purple-400">
                  {item.filename}
                </p>

                <p className="mt-1">
                  {item.transcription}
                </p>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => copyText(item.transcription)}
                    className="bg-slate-800 px-3 py-1 rounded hover:bg-slate-700 transition"
                  >
                    📋 Copy
                  </button>

                  <button
                    onClick={() =>
                      downloadText(
                        item.transcription,
                        item.filename
                      )
                    }
                    className="bg-slate-800 px-3 py-1 rounded hover:bg-slate-700 transition"
                  >
                    ⬇ Download
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  {new Date(item.uploadDate).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;