import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import AuthCallback from "./AuthCallback";

// I use Assembly API
const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (window.location.pathname === "/auth/callback") {
    return <AuthCallback />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-300">
          Checking session...
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  return <SpeechDashboard session={session} />;
}

function AuthScreen() {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        setMessage(
          "Signup successful. Please check your email and click the verification link to continue."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        setMessage("Login successful. Redirecting...");
      }
    } catch (err) {
      setMessage(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setMessage("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage(err.message || "Google sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 md:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 lg:block md:p-12">
            <div className="mb-4 text-xs uppercase tracking-[0.35em] text-teal-300/80">
              Speech Studio
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
              Turn live speech, recordings, and uploads into text in one clean workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-400">
              Start using live speech and audio transcription.
            </p>
          </section>

          <aside className="rounded-[32px] border border-white/10 bg-white/5 p-6 md:p-10">
            <div className="mb-6 flex rounded-2xl border border-white/10 bg-slate-900/70 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-teal-500 text-slate-950"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-teal-500 text-slate-950"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                Sign Up
              </button>
            </div>

            <h2 className="text-2xl font-semibold text-white">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "login"
                ? "Login to continue to your speech-to-text workspace."
                : "Sign up to start using live speech and audio transcription."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
                  
                />
              </div>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-teal-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-teal-400 disabled:opacity-70"
              >
                {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs uppercase tracking-[0.25em] text-slate-500">Or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-70"
            >
              Continue with Google
            </button>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "login" ? (
                <>
                  Don’t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setMessage("");
                    }}
                    className="text-teal-300 hover:text-teal-200"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setMessage("");
                    }}
                    className="text-teal-300 hover:text-teal-200"
                  >
                    Login
                  </button>
                </>
              )}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SpeechDashboard({ session }) {
  const [activeTab, setActiveTab] = useState("live");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [recordTranscript, setRecordTranscript] = useState("");
  const [uploadTranscript, setUploadTranscript] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveStatus, setLiveStatus] = useState("Idle");
  const [isLiveListening, setIsLiveListening] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const liveSocketRef = useRef(null);
  const liveStreamRef = useRef(null);
  const liveAudioContextRef = useRef(null);
  const liveProcessorRef = useRef(null);
  const liveSourceRef = useRef(null);

  useEffect(() => {
    fetchHistoryAgain();

    return () => {
      cleanupLive();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.user?.id]);

  const fetchHistoryAgain = async () => {
    if (!session?.user?.id) return;

    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/history/${session.user.id}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const logout = async () => {
    cleanupLive();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    await supabase.auth.signOut();
  };

  const sendAudio = async (audioFile, source = "upload") => {
    if (!session?.user?.id) return;

    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("userId", session.user.id);

    if (source === "record") {
      setRecordLoading(true);
      setRecordTranscript("");
    } else {
      setUploadLoading(true);
      setUploadTranscript("");
    }

    try {
      const res = await fetch(`${API}/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");

      if (source === "record") {
        setRecordTranscript(data.text || "No transcription received");
      } else {
        setUploadTranscript(data.text || "No transcription received");
      }

      await fetchHistoryAgain();
    } catch (err) {
      if (source === "record") {
        setRecordTranscript(`Error: ${err.message}`);
      } else {
        setUploadTranscript(`Error: ${err.message}`);
      }
    } finally {
      if (source === "record") setRecordLoading(false);
      else setUploadLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "recording.webm", {
          type: "audio/webm",
        });

        stream.getTracks().forEach((track) => track.stop());
        await sendAudio(audioFile, "record");
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTranscript("");
      setRecordSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setRecordTranscript(`Error: ${err.message || "Microphone access failed"}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setUploadTranscript("Please choose an audio file first");
      return;
    }
    await sendAudio(selectedFile, "upload");
  };

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const floatTo16BitPCM = (input) => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;

    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  };

  const downsampleBuffer = (buffer, inputSampleRate, outputSampleRate) => {
    if (outputSampleRate === inputSampleRate) return buffer;

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  };

  const cleanupLive = () => {
    try {
      if (liveProcessorRef.current) liveProcessorRef.current.disconnect();
      if (liveSourceRef.current) liveSourceRef.current.disconnect();
      if (liveAudioContextRef.current) liveAudioContextRef.current.close();
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (liveSocketRef.current) liveSocketRef.current.close();
    } catch {}

    liveProcessorRef.current = null;
    liveSourceRef.current = null;
    liveAudioContextRef.current = null;
    liveStreamRef.current = null;
    liveSocketRef.current = null;
  };

  const startLiveListening = async () => {
    try {
      setLiveTranscript("");
      setLiveStatus("Requesting mic...");
      setIsLiveListening(true);

      const tokenRes = await fetch(`${API}/live-token`);
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error || "Failed to get live token");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;

      const socket = new WebSocket(
        `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&token=${tokenData.token}&speech_model=u3-rt-pro`
      );
      liveSocketRef.current = socket;

      socket.onopen = () => {
        setLiveStatus("Listening...");

        const audioContext = new AudioContext();
        liveAudioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        liveSourceRef.current = source;

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        liveProcessorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (!liveSocketRef.current || liveSocketRef.current.readyState !== 1) return;

          const inputData = event.inputBuffer.getChannelData(0);
          const downsampled = downsampleBuffer(inputData, audioContext.sampleRate, 16000);
          const pcm = floatTo16BitPCM(downsampled);

          liveSocketRef.current.send(pcm);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          const text = data.transcript || data.text || "";

          if (text.trim()) {
            setLiveTranscript((prev) => `${prev} ${text}`.trim());
          }
        } catch {}
      };

      socket.onerror = () => {
        setLiveStatus("Live connection error");
      };

      socket.onclose = () => {
        cleanupLive();
        setIsLiveListening(false);
        setLiveStatus("Stopped");
      };
    } catch (err) {
      cleanupLive();
      setIsLiveListening(false);
      setLiveStatus(`Error: ${err.message}`);
    }
  };

  const stopLiveListening = () => {
    cleanupLive();
    setIsLiveListening(false);
    setLiveStatus("Stopped");
  };

  const navItems = [
    { key: "live", label: "Live Transcript" },
    { key: "record", label: "Record Audio" },
    { key: "upload", label: "Upload Audio" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 border-r border-white/10 bg-slate-900/70 p-6 md:block">
          <div className="mb-8">
            <div className="mb-2 text-xs uppercase tracking-[0.3em] text-teal-300/80">
              Speech Studio
            </div>
            <h1 className="text-2xl font-semibold text-white">TranscribeFlow</h1>
            <p className="mt-2 text-sm text-slate-400">
              Live speaking, recording, uploads, and audio history in one workspace.
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                  activeTab === item.key
                    ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-400/30"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-400">Logged in as</div>
            <div className="mt-1 break-all text-sm text-white">{session.user.email}</div>
            <button
              onClick={logout}
              className="mt-4 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/15"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <header className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.3em] text-teal-300/80">Dashboard</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Speech-to-text workspace</h2>
            <p className="mt-2 text-sm text-slate-400">
              Use live transcription, recording, and upload.
            </p>
            
          </header>

          {activeTab === "live" && (
            <>
              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] text-teal-300/80">Live Speaking</div>
                      <h3 className="mt-2 text-xl font-semibold">Speak into your microphone</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        Start live speech and watch the transcript update in real time.
                      </p>
                    </div>
                    <div className="rounded-full bg-teal-500/10 px-4 py-2 text-xs text-teal-300">
                      {liveStatus}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-6">
                    <div className="mb-5 flex h-28 items-center justify-center rounded-[22px] border border-dashed border-teal-400/20 bg-white/[0.03]">
                      <div className="flex items-end gap-2">
                        {[18, 30, 20, 36, 22, 32, 16, 28].map((h, i) => (
                          <span
                            key={i}
                            className="w-2 rounded-full bg-teal-400/70"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>

                    {!isLiveListening ? (
                      <button
                        onClick={startLiveListening}
                        className="rounded-full bg-teal-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-teal-400"
                      >
                        Start Live Speaking
                      </button>
                    ) : (
                      <button
                        onClick={stopLiveListening}
                        className="rounded-full bg-rose-500 px-6 py-3 text-sm font-medium text-white hover:bg-rose-400"
                      >
                        Stop Live Speaking
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <div className="mb-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-teal-300/80">Live Transcript</div>
                    <h3 className="mt-2 text-xl font-semibold text-white">Single live transcript card</h3>
                  </div>

                  <div className="min-h-[380px] rounded-[24px] border border-white/10 bg-slate-950/60 p-5 text-sm leading-7 text-slate-200 whitespace-pre-wrap">
                    {liveTranscript ? (
                      liveTranscript
                    ) : (
                      <p className="text-slate-500">Your live transcript will appear here while speaking.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-teal-300/80">History</div>
                    <h3 className="mt-2 text-xl font-semibold text-white">Old audio cards</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Recorded and uploaded audio transcripts are shown here below the live transcript section.
                    </p>
                  </div>

                  <button
                    onClick={fetchHistoryAgain}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                  >
                    Refresh
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {historyLoading ? (
                    <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                      Loading history...
                    </div>
                  ) : history.length > 0 ? (
                    history.map((item) => (
                      <div key={item._id} className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                        <div className="text-xs uppercase tracking-[0.2em] text-teal-300/80">Old Audio</div>
                        <h4 className="mt-2 truncate text-sm font-medium text-white">{item.filename}</h4>
                        <p className="mt-3 text-sm leading-6 text-slate-400 whitespace-pre-wrap">
                          {item.transcription}
                        </p>
                        <div className="mt-4 text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">
                      No old audios found yet.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === "record" && (
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.3em] text-teal-300/80">Record Audio</div>
                <h3 className="mt-2 text-xl font-semibold text-white">Capture voice from microphone</h3>
              </div>

              <div className="flex flex-col items-start gap-4 rounded-[24px] border border-white/10 bg-slate-950/50 p-6">
                <div className="text-4xl font-semibold tracking-wider text-white">
                  {formatTime(recordSeconds)}
                </div>

                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="rounded-full bg-teal-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-teal-400"
                  >
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="rounded-full bg-rose-500 px-6 py-3 text-sm font-medium text-white hover:bg-rose-400"
                  >
                    Stop Recording
                  </button>
                )}

                <div className="w-full rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300 whitespace-pre-wrap">
                  {recordLoading ? (
                    <p>Processing your recorded audio...</p>
                  ) : recordTranscript ? (
                    recordTranscript
                  ) : (
                    <p>Press start recording and speak clearly into your microphone.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "upload" && (
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="mb-6">
                <div className="text-xs uppercase tracking-[0.3em] text-teal-300/80">Upload Audio</div>
                <h3 className="mt-2 text-xl font-semibold text-white">Select an audio file to transcribe</h3>
              </div>

              <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/50 p-6">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-teal-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-teal-400"
                />

                <button
                  onClick={uploadFile}
                  className="mt-5 rounded-full bg-white/10 px-5 py-3 text-sm text-white hover:bg-white/15"
                >
                  Upload and Transcribe
                </button>

                <div className="mt-5 rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300 whitespace-pre-wrap">
                  {uploadLoading ? (
                    <p>Uploading and transcribing your file...</p>
                  ) : uploadTranscript ? (
                    uploadTranscript
                  ) : (
                    <p>Choose one audio file and upload it.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "history" && (
            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-teal-300/80">History</div>
                  <h3 className="mt-2 text-xl font-semibold text-white">Saved audio transcripts</h3>
                </div>

                <button
                  onClick={fetchHistoryAgain}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Refresh
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {historyLoading ? (
                  <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                    Loading history...
                  </div>
                ) : history.length > 0 ? (
                  history.map((item) => (
                    <div key={item._id} className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-teal-300/80">Old Audio</div>
                      <h4 className="mt-2 truncate text-sm font-medium text-white">{item.filename}</h4>
                      <p className="mt-3 text-sm leading-6 text-slate-400 whitespace-pre-wrap">
                        {item.transcription}
                      </p>
                      <div className="mt-4 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">
                    No transcript history found for this user.
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}