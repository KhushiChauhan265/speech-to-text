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

  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // ✅ backend url (new update)
  const API = import.meta.env.VITE_BACKEND_URL;

  // ---------------- AUTH SESSION ----------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

    return () => subscription.unsubscribe();
  }, []);

  // ---------------- FETCH HISTORY ----------------
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API}/history/${session.user.id}`);
        const data = await res.json();
        setHistory(data || []);
      } catch (err) {
        setError("❌ Unable to load history");
      }
    };

    fetchHistory();
  }, [session]);

  // ---------------- AUTH ----------------
  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Signup successful! Check email.");
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ---------------- AUDIO TYPES ----------------
  const allowedTypes = [
    "audio/mp3",
    "audio/wav",
    "audio/mpeg",
    "audio/webm",
    "video/mp4",
  ];

  // ---------------- SEND AUDIO ----------------
  const sendAudio = async (audioFile) => {
    if (!session?.user?.id) {
      setError("❌ Login required");
      return;
    }

    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("userId", session.user.id);

    setLoading(true);
    setMsg("");
    setError("");

    try {
      const res = await fetch(`${API}/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Server error");

      setSpeechText(data.text);
      setMsg("✅ Transcription completed");

      // refresh history
      const historyRes = await fetch(`${API}/history/${session.user.id}`);
      const historyData = await historyRes.json();
      setHistory(historyData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FILE UPLOAD ----------------
  const uploadFile = async () => {
    setError("");
    setMsg("");

    if (!file) return setError("⚠️ Please select a file first");
    if (!allowedTypes.includes(file.type))
      return setError("❌ Invalid file type");

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
      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } catch {
      setError("❌ Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  // ---------------- SPEECH ----------------
  const toggleSpeech = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return alert("Chrome browser use karo");
    }

    if (isSpeaking) {
      recognitionRef.current?.stop();
      setIsSpeaking(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = "";

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
      setError("❌ Speech recognition error");
      setIsSpeaking(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsSpeaking(true);
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

  // ---------------- LOGIN UI ----------------
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-slate-900 p-6 rounded-xl w-[350px]">
          <h1 className="text-xl mb-3 text-center">
            Speech To Text Login
          </h1>

          <input
            className="w-full p-2 mb-2 bg-slate-800"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full p-2 mb-3 bg-slate-800"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleSignup}
            className="bg-green-600 w-full p-2 mb-2"
          >
            Signup
          </button>

          <button
            onClick={handleLogin}
            className="bg-purple-600 w-full p-2"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // ---------------- MAIN UI ----------------
  return (
    <div className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <div className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-3xl font-bold text-purple-400">
          🎤 Speech To Text
        </h1>

        <button
          onClick={handleLogout}
          className="mt-2 bg-red-600 px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* LOADING */}
        {loading && (
          <p className="text-yellow-400 mb-2">
            ⏳ Processing audio...
          </p>
        )}

        {/* MSG */}
        {msg && <p className="text-green-400">{msg}</p>}
        {error && <p className="text-red-400">{error}</p>}

        {/* RESULT */}
        {speechText && (
          <div className="bg-slate-900 p-4 rounded-xl mb-6">
            <p className="text-gray-400">Transcribed Text</p>
            <p>{speechText}</p>
          </div>
        )}

        {/* FILE UPLOAD */}
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          onClick={uploadFile}
          className="bg-purple-600 px-4 py-2 mt-3"
        >
          Upload Audio
        </button>

        {/* ACTIONS */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={startRecording}
            className="bg-slate-800 px-4 py-2"
          >
            🎙 Record
          </button>

          <button
            onClick={stopRecording}
            className="bg-red-600 px-4 py-2"
          >
            Stop
          </button>

          <button
            onClick={toggleSpeech}
            className="bg-blue-600 px-4 py-2"
          >
            {isSpeaking ? "Stop" : "Speak"}
          </button>
        </div>

        {/* TIMER */}
        {recording && (
          <p className="text-red-400 mt-2">
            ⏺ {formatTime(recordTime)}
          </p>
        )}

        {/* HISTORY */}
        <div className="mt-10">
          <h2 className="text-xl mb-3">History</h2>

          {history.length === 0 ? (
            <p className="text-gray-400">No history</p>
          ) : (
            history.map((item) => (
              <div
                key={item._id}
                className="bg-slate-900 p-4 mb-3 rounded-xl"
              >
                <p className="text-purple-400">
                  {item.filename}
                </p>

                <p>{item.transcription}</p>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() =>
                      copyText(item.transcription)
                    }
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
                  >
                    ⬇ Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;