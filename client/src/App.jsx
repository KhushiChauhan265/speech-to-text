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

  const API = import.meta.env.VITE_BACKEND_URL;

  // ---------------- AUTH ----------------
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

  // ---------------- HISTORY ----------------
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
    else alert("Signup successful!");
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else alert("Login successful!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ---------------- AUDIO ----------------
  const allowedTypes = ["audio/mp3", "audio/wav", "audio/mpeg", "audio/webm", "video/mp4"];

  const sendAudio = async (audioFile) => {
    if (!session?.user?.id) {
      setError("❌ User not logged in");
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

      if (!res.ok) {
        throw new Error(data.error || "Server error");
      }

      if (data.text) {
        setSpeechText(data.text);
        setMsg("✅ Transcription completed");

        const historyRes = await fetch(`${API}/history/${session.user.id}`);
        const historyData = await historyRes.json();
        setHistory(historyData || []);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!file) return setError("⚠️ Please select a file first");
    if (!allowedTypes.includes(file.type)) return setError("❌ Invalid file type");
    await sendAudio(file);
  };

  // ---------------- RECORDING ----------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        await sendAudio(file);
      };

      mediaRecorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);

    } catch {
      setError("❌ Mic access denied");
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

    if (!SpeechRecognition) return alert("Use Chrome");

    if (isSpeaking) {
      recognitionRef.current?.stop();
      setIsSpeaking(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setSpeechText(text);
    };

    recognition.onerror = () => {
      setError("❌ Speech recognition error");
      setIsSpeaking(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsSpeaking(true);
  };

  // ---------------- LOGIN UI ----------------
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-slate-900 p-6 rounded-xl w-[350px]">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 mb-2 bg-slate-800"/>
          <input value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full p-2 mb-2 bg-slate-800"/>

          <button onClick={handleSignup} className="bg-green-600 w-full p-2 mb-2">Signup</button>
          <button onClick={handleLogin} className="bg-purple-600 w-full p-2">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <h1 className="text-2xl">Speech To Text</h1>
      <button onClick={handleLogout} className="bg-red-600 px-3 py-1 mt-2">Logout</button>

      {loading && <p className="text-yellow-400">Processing...</p>}
      {msg && <p className="text-green-400">{msg}</p>}
      {error && <p className="text-red-400">{error}</p>}

      <input type="file" onChange={(e)=>setFile(e.target.files[0])} />
      <button onClick={uploadFile} className="bg-purple-600 p-2 mt-2">Upload</button>

      <button onClick={startRecording} className="bg-slate-700 p-2 m-2">Record</button>
      <button onClick={stopRecording} className="bg-red-600 p-2 m-2">Stop</button>

      <button onClick={toggleSpeech} className="bg-blue-600 p-2 m-2">
        {isSpeaking ? "Stop" : "Speak"}
      </button>

      <p className="mt-4">{speechText}</p>

    </div>
  );
}

export default App;