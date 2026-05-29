import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function AuthCallback() {
  const [message, setMessage] = useState("Verifying your account...");

  useEffect(() => {
    const finishAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session) {
          window.location.href = "/";
          return;
        }

        setMessage("Verification completed. Redirecting...");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } catch (err) {
        setMessage(err.message || "Verification failed");
      }
    };

    finishAuth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-teal-300/80">
          Speech Studio
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Email Verification</h1>
        <p className="mt-3 text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}