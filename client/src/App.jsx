import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

function App() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const [history, setHistory] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  const [error, setError] = useState("");

  // ---------------- AUTH SESSION ----------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ---------------- FETCH HISTORY ----------------
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/history/${session.user.id}`
        );

        const data = await res.json();

        setHistory(data);
      } catch (err) {
        console.log(err);
        setError("❌ Unable to load history");
      }
    };

    fetchHistory();
  }, [session]);

  // ---------------- AUTH FUNCTIONS ----------------
  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Signup successful! Check your email.");
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Login successful!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ---------------- VALIDATION ----------------
  const allowedTypes = [
    "audio/mp3",
    "audio/wav",
    "audio/mpeg",
    "audio/webm",
    "video/mp4",
  ];

  // ---------------- SEND AUDIO ----------------
  const sendAudio = async (audioFile) => {
    const formData = new FormData();

    formData.append("file", audioFile);
    formData.append("userId", session.user.id);

    setLoading(true);
    setMsg("");
    setError("");

    try {
      const res = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Server error during transcription");
      }

      const data = await res.json();

      if (data.text) {
        setSpeechText(data.text);
        setMsg("✅ Transcription completed");

        const historyRes = await fetch(
          `http://localhost:5000/history/${session.user.id}`
        );

        const historyData = await historyRes.json();
        setHistory(historyData);
      } else {
        setError("❌ No text returned from server");
      }
    } catch (err) {
      setError(err.message || "❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FILE UPLOAD ----------------
  const uploadFile = async () => {
    setError("");
    setMsg("");

    if (!file) {
      return setError("⚠️ Please select a file first");
    }

    if (!allowedTypes.includes(file.type)) {
      return setError("❌ Invalid file type selected");
    }

    await sendAudio(file);
  };

  // ---------------- RECORDING ----------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        const file = new File([blob], "recording.webm", {
          type: "audio/webm",
        });

        await sendAudio(file);
      };

      mediaRecorder.start();

      setRecording(true);
      setMsg("🎤 Recording...");
      setError("");

      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      setError("❌ Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    clearInterval(timerRef.current);

    setRecording(false);
    setMsg("⏹ Recording stopped");
  };

  // ---------------- LIVE SPEECH ----------------
  const toggleSpeech = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return alert("Use Chrome Browser");
    }

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
    setError("");

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
      setError("❌ Speech recognition error");
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
    const blob = new Blob([text], {
      type: "text/plain",
    });

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

  // ---------------- LOGIN UI ----------------
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-slate-900 p-6 rounded-xl w-[350px]">
          <h1 className="text-2xl font-bold mb-4 text-center">
            Speech To Text Login
          </h1>

          <input
            type="email"
            placeholder="Enter Email"
            className="w-full p-2 mb-3 rounded bg-slate-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Enter Password"
            className="w-full p-2 mb-3 rounded bg-slate-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex gap-3">
            <button
              onClick={handleSignup}
              className="bg-green-600 px-4 py-2 rounded w-full"
            >
              Signup
            </button>

            <button
              onClick={handleLogin}
              className="bg-purple-600 px-4 py-2 rounded w-full"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <div className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-3xl font-extrabold text-purple-400 tracking-wide">
          🎤 Speech To Text
        </h1>

        <button
          onClick={handleLogout}
          className="mt-3 bg-red-600 px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* LOADING */}
        {loading && (
          <div className="mb-4 flex items-center gap-2 text-yellow-400">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            Processing audio...
          </div>
        )}

        {/* SUCCESS */}
        {!loading && msg && (
          <div className="mb-3 text-sm text-green-400">
            {msg}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-3 text-sm text-red-400">
            {error}
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

        {/* FILE */}
        <label className="border-2 border-dashed border-purple-600 rounded-2xl p-10 flex flex-col items-center cursor-pointer hover:bg-slate-900 transition">
          <p className="text-gray-300">
            Drag & drop audio file
          </p>

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
          <h2 className="text-xl mb-3">
            History
          </h2>

          <div className="max-h-80 overflow-y-auto space-y-3 pr-2">

            {history.length > 0 ? (
              history.map((item) => (
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
                      onClick={() =>
                        copyText(item.transcription)
                      }
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
                    {new Date(item.createdAt).toLocaleString()}
                  </p>

                </div>
              ))
            ) : (
              <p className="text-gray-400">
                No history found
              </p>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

export default App;