import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { tatamiLogin, setTatamiSession, clearTatamiSession } from "../api/tatami";
import logo from "../assets/logo/oppidanlogo-removebg-preview.png";

export default function TatamiLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ensure login screen is ALWAYS a completely clean login state with no stale Tatami session
  useEffect(() => {
    clearTatamiSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError("Please enter both Tatami username and password");
      return;
    }

    try {
      setLoading(true);
      const data = await tatamiLogin(cleanUsername, password);

      if (data?.access_token && data?.tatami) {
        // Store JWT and session
        setTatamiSession(data.access_token, data.tatami);

        // Redirect directly to Tatami dashboard
        navigate("/tatami/dashboard", { replace: true });
      } else {
        setError("Invalid response received from server");
      }
    } catch (err) {
      console.error("Tatami login failed:", err);

      if (err.response?.status === 401) {
        setError("Invalid username or password");
      } else if (err.response?.data?.message) {
        const msg = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(", ")
          : err.response.data.message;
        setError(msg);
      } else if (err.message === "Network Error") {
        setError("Unable to connect to server. Please ensure backend is running.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] bg-[radial-gradient(at_top_left,_#e2e8f0_0%,_transparent_50%),_radial-gradient(at_top_right,_#cbd5e1_0%,_transparent_50%)] flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <img
          src={logo}
          alt="Oppidan Logo"
          className="h-16 mx-auto mb-3 object-contain drop-shadow-sm"
        />
        <div className="inline-flex items-center gap-2 bg-[#0a1f44] text-white px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase shadow-sm">
          <Shield size={13} className="text-blue-400" />
          Tatami Match Arena
        </div>
      </motion.div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-[#1e266d] tracking-tight">
            TATAMI LOGIN
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
            Enter your Tatami credentials to access match management
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-sm font-medium"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label
              htmlFor="tatami-username-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
            >
              Tatami Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Shield size={18} />
              </div>
              <input
                id="tatami-username-input"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. TATAMI_1"
                disabled={loading}
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="tatami-password-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                id="tatami-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="••••••••"
                disabled={loading}
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="tatami-login-btn"
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2
              ${
                loading
                  ? "bg-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-[#0a1f44] to-[#1e3a8a] hover:from-[#0d2857] hover:to-[#254ab8] hover:shadow-indigo-500/25 active:scale-[0.99]"
              }`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <span>LOGIN</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Organizer Link */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs text-slate-400 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
          >
            Tournament Organizer? Return to Organizer Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
