import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createTatamis,
  getTatamisByTournament,
  deleteTatami,
  resetTatamiPassword,
} from "../api/tatami";
import { getTournaments } from "../api/tournaments";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  KeyRound,
  AlertTriangle,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

const TatamiPage = () => {
  const [no_of_tatamis, setNoOfTatamis] = useState("");
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [tatamis, setTatamis] = useState([]);
  const [loadingTatamis, setLoadingTatamis] = useState(false);

  // In-session passwords map: tatamiId -> plainPassword (only available immediately after creation or reset)
  const [sessionPasswords, setSessionPasswords] = useState({});
  // Masking toggles map: tatamiId/key -> boolean
  const [visiblePasswords, setVisiblePasswords] = useState({});
  // Clipboard copy state feedback: key -> boolean
  const [copiedKey, setCopiedKey] = useState(null);

  // Reset Password Confirmation Modal
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    tatami: null,
    customPassword: "",
    loading: false,
    error: "",
  });

  // Recent reset banner/toast notification
  const [recentReset, setRecentReset] = useState(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await getTournaments();
        const data = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(data)) {
          setTournaments(data);
        } else {
          setTournaments([]);
        }
      } catch (err) {
        console.error("Failed to load tournaments:", err);
        setTournaments([]);
      }
    };
    fetchTournaments();
  }, []);

  useEffect(() => {
    const fetchTatamis = async () => {
      if (!selectedTournament) {
        setTatamis([]);
        return;
      }

      try {
        setLoadingTatamis(true);
        const res = await getTatamisByTournament(selectedTournament);
        const data = Array.isArray(res) ? res : res?.data;
        setTatamis(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load Tatamis:", err);
        setTatamis([]);
      } finally {
        setLoadingTatamis(false);
      }
    };

    fetchTatamis();
  }, [selectedTournament]);

  const handleChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setNoOfTatamis(value);
    }
  };

  const handleCopy = async (text, key) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleCopyAll = async () => {
    if (!credentials?.tatamis?.length) return;
    const formatted = credentials.tatamis
      .map(
        (t) =>
          `TATAMI ${t.number}\nUsername: ${t.username}\nPassword: ${t.password}\n`
      )
      .join("\n--------------------\n");
    await handleCopy(formatted, "copy_all_credentials");
  };

  const toggleVisibility = (key) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleDeleteTatami = async (tatami) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Tatami ${tatami.number} (${tatami.username})?`
    );

    if (!confirmed) return;

    try {
      await deleteTatami(tatami.id);

      // Clean up session password if stored
      setSessionPasswords((prev) => {
        const copy = { ...prev };
        delete copy[tatami.id];
        return copy;
      });

      // Refresh list
      const res = await getTatamisByTournament(selectedTournament);
      const data = Array.isArray(res) ? res : res?.data;
      setTatamis(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to delete Tatami:", error);
      alert(error?.response?.data?.message || "Failed to delete Tatami");
    }
  };

  const handleConfirm = async () => {
    if (!selectedTournament) {
      alert("Please select a tournament first.");
      return;
    }

    if (!no_of_tatamis || Number(no_of_tatamis) <= 0) {
      alert("Please enter a valid number of Tatamis to add.");
      return;
    }

    try {
      setLoading(true);
      const res = await createTatamis(selectedTournament, Number(no_of_tatamis));
      const newlyCreated = res.data?.tatamis || [];

      setCredentials({
        tatamis: newlyCreated,
      });

      // Save plaintext passwords in session map so they also display in the management table below
      setSessionPasswords((prev) => {
        const updated = { ...prev };
        newlyCreated.forEach((t) => {
          if (t.id && t.password) {
            updated[t.id] = t.password;
          }
        });
        return updated;
      });

      // Refresh list
      const updatedRes = await getTatamisByTournament(selectedTournament);
      const updatedData = Array.isArray(updatedRes)
        ? updatedRes
        : updatedRes?.data;
      setTatamis(Array.isArray(updatedData) ? updatedData : []);

      setNoOfTatamis("");
    } catch (error) {
      console.error("Create tatamis error:", error);
      alert(
        error?.response?.data?.message ||
          "Something went wrong while creating Tatamis"
      );
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = (tatami) => {
    setResetModal({
      isOpen: true,
      tatami,
      customPassword: "",
      loading: false,
      error: "",
    });
  };

  const handleConfirmReset = async () => {
    if (!resetModal.tatami) return;
    try {
      setResetModal((prev) => ({ ...prev, loading: true, error: "" }));
      const res = await resetTatamiPassword(
        resetModal.tatami.id,
        resetModal.customPassword
      );

      // Store new plain password in session state
      setSessionPasswords((prev) => ({
        ...prev,
        [resetModal.tatami.id]: res.password,
      }));

      // Make new password visible by default so organizer immediately sees it
      setVisiblePasswords((prev) => ({
        ...prev,
        [resetModal.tatami.id]: true,
      }));

      setRecentReset({
        tatamiId: resetModal.tatami.id,
        username: res.username || resetModal.tatami.username,
        number: res.number || resetModal.tatami.number,
        password: res.password,
      });

      setResetModal({
        isOpen: false,
        tatami: null,
        customPassword: "",
        loading: false,
        error: "",
      });
    } catch (err) {
      console.error("Reset password failed:", err);
      setResetModal((prev) => ({
        ...prev,
        loading: false,
        error:
          err.response?.data?.message ||
          "Failed to reset password. Please try again.",
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] bg-[radial-gradient(at_top_left,_#e2e8f0_0%,_transparent_50%),_radial-gradient(at_top_right,_#cbd5e1_0%,_transparent_50%)] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ============================================================
            RECENT RESET NOTIFICATION BANNER
        ============================================================ */}
        <AnimatePresence>
          {recentReset && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="font-black text-emerald-950 text-sm">
                    Password Reset for Tatami {recentReset.number} ({recentReset.username})
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-emerald-700 font-medium">New Password:</span>
                    <span className="font-mono font-bold text-sm bg-white/80 px-2.5 py-0.5 rounded border border-emerald-200 text-emerald-900">
                      {recentReset.password}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      recentReset.password,
                      `recent_reset_${recentReset.tatamiId}`
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  {copiedKey === `recent_reset_${recentReset.tatamiId}` ? (
                    <>
                      <Check size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Password</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRecentReset(null)}
                  className="p-2 text-emerald-600 hover:text-emerald-900 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            CREATE TATAMIS CARD / NEW CREDENTIALS SUMMARY
        ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-xl shadow-xl rounded-3xl p-6 sm:p-10 border border-white/80"
        >
          {credentials ? (
            /* --------------------------------------------------------
               SHOW CREDENTIALS AFTER BATCH CREATION
            -------------------------------------------------------- */
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-[#3f4191] mb-3">
                  <KeyRound size={28} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#1e266d] tracking-tight">
                  Tatami Login Credentials
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                  {credentials.tatamis.length} new Tatami(s) created. Distribute these credentials to Tatami operators.
                </p>
              </div>

              {/* Warning Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-xs font-medium">
                <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Important Security Notice:</strong> Passwords are shown only upon creation or password reset. They are stored as secure hashes in the database and cannot be recovered if this view is closed.
                </span>
              </div>

              {/* Individual Credential Cards */}
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {credentials.tatamis.map((t) => {
                  const cardKey = `batch_${t.number}`;
                  const isVisible = Boolean(visiblePasswords[cardKey]);
                  const isCopied = copiedKey === cardKey;

                  return (
                    <motion.div
                      key={t.number}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#3f4191] text-white flex items-center justify-center font-black text-sm shrink-0">
                          {t.number}
                        </div>
                        <div>
                          <h4 className="font-black text-[#1e266d] text-sm">
                            TATAMI {t.number}
                          </h4>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>Username:</span>
                            <span className="font-mono font-bold text-slate-700">
                              {t.username}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-400">
                            Password:
                          </span>
                          <span className="font-mono font-bold text-xs text-slate-800 min-w-[70px]">
                            {isVisible ? t.password : "••••••••"}
                          </span>
                        </div>

                        {/* Show / Hide Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleVisibility(cardKey)}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                          title={isVisible ? "Hide password" : "Show password"}
                        >
                          {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(t.password, cardKey)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm
                            ${
                              isCopied
                                ? "bg-emerald-600 text-white"
                                : "bg-indigo-50 hover:bg-indigo-100 text-[#3f4191]"
                            }`}
                          title="Copy Password"
                        >
                          {isCopied ? (
                            <>
                              <Check size={13} />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#3f4191] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedKey === "copy_all_credentials" ? (
                    <>
                      <Check size={16} />
                      <span>All Credentials Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy All Credentials</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCredentials(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#3f4191] hover:bg-[#2e3b7e] text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                >
                  Done / Close Summary
                </button>
              </div>
            </div>
          ) : (
            /* --------------------------------------------------------
               CREATE TATAMIS FORM
            -------------------------------------------------------- */
            <div>
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-black text-[#1e266d] tracking-tight">
                  Add Tatamis
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Create new competition arenas with secure credentials
                </p>
              </div>

              {/* Tournament Dropdown */}
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Select Tournament
                </label>
                <select
                  value={selectedTournament}
                  onChange={(e) => setSelectedTournament(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm text-slate-700 bg-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 
                             transition-all shadow-sm"
                >
                  <option value="">-- Choose a Tournament --</option>
                  {Array.isArray(tournaments) &&
                    tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Tatami Count Input */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Number of New Tatamis to Add
                </label>
                <input
                  type="text"
                  value={no_of_tatamis}
                  onChange={handleChange}
                  placeholder="e.g. 2, 4"
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm text-slate-700 placeholder-slate-400 bg-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 
                             transition-all shadow-sm font-semibold"
                />
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-black text-sm text-white uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer
                  ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed shadow-none"
                      : "bg-[#3f4191] hover:bg-[#2e3b7e] active:scale-[0.99] shadow-indigo-300"
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Creating Tatamis...</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Confirm & Generate Credentials</span>
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* ============================================================
            EXISTING TATAMIS CREDENTIAL & MANAGEMENT TABLE
        ============================================================ */}
        {selectedTournament && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white/80 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xl p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1e266d]">
                  Tatami Management & Credentials
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Overview of all Tatamis configured for this tournament
                </p>
              </div>

              <div className="inline-flex items-center gap-2 bg-indigo-50 text-[#3f4191] px-4 py-2 rounded-xl font-black text-sm self-start sm:self-auto">
                <Shield size={16} />
                <span>{tatamis.length} Tatamis Active</span>
              </div>
            </div>

            {loadingTatamis ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-[#3f4191]" />
                <span className="text-sm font-semibold">Loading Tatamis...</span>
              </div>
            ) : tatamis.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/70 border border-slate-200/60 rounded-2xl">
                <p className="font-bold text-slate-600 text-sm">
                  No Tatamis created for this tournament yet.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Use the form above to add Tatamis.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="pb-3 px-3">Tatami</th>
                      <th className="pb-3 px-3">Username</th>
                      <th className="pb-3 px-3">Password</th>
                      <th className="pb-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tatamis.map((tatami) => {
                      const plainPassword = sessionPasswords[tatami.id];
                      const hasPassword = Boolean(plainPassword);
                      const isVisible = Boolean(visiblePasswords[tatami.id]);
                      const isCopied = copiedKey === `table_${tatami.id}`;

                      return (
                        <tr
                          key={tatami.id}
                          className="hover:bg-slate-50/70 transition-colors text-sm"
                        >
                          {/* Tatami Number & Badge */}
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#3f4191] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                                {tatami.number}
                              </div>
                              <span className="font-black text-[#1e266d]">
                                Tatami {tatami.number}
                              </span>
                            </div>
                          </td>

                          {/* Username */}
                          <td className="py-4 px-3">
                            <span className="font-mono font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 text-xs">
                              {tatami.username}
                            </span>
                          </td>

                          {/* Password Field (Show / Copy / Not available) */}
                          <td className="py-4 px-3">
                            {hasPassword ? (
                              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                                <span className="font-mono font-bold text-xs text-slate-800">
                                  {isVisible ? plainPassword : "••••••••"}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => toggleVisibility(tatami.id)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                                  title={isVisible ? "Hide" : "Show"}
                                >
                                  {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(
                                      plainPassword,
                                      `table_${tatami.id}`
                                    )
                                  }
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    isCopied
                                      ? "text-emerald-600"
                                      : "text-slate-400 hover:text-[#3f4191]"
                                  }`}
                                  title="Copy Password"
                                >
                                  {isCopied ? (
                                    <Check size={14} />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium italic">
                                <span>Not available</span>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Reset Password Button */}
                              <button
                                type="button"
                                onClick={() => openResetModal(tatami)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#3f4191] font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                title="Reset / Regenerate Password"
                              >
                                <KeyRound size={13} />
                                <span>Reset Password</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteTatami(tatami)}
                                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                title="Delete Tatami"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ============================================================
          PASSWORD RESET CONFIRMATION MODAL
      ============================================================ */}
      <AnimatePresence>
        {resetModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#3f4191] flex items-center justify-center shrink-0">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">
                      Reset Password
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tatami {resetModal.tatami?.number} ({resetModal.tatami?.username})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setResetModal({
                      isOpen: false,
                      tatami: null,
                      customPassword: "",
                      loading: false,
                      error: "",
                    })
                  }
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Are you sure you want to reset the password for{" "}
                <strong className="text-slate-900 font-bold">
                  {resetModal.tatami?.username}
                </strong>
                ? The existing password will be invalidated immediately.
              </p>

              {/* Optional custom password input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Custom Password (optional)
                </label>
                <input
                  type="text"
                  value={resetModal.customPassword}
                  onChange={(e) =>
                    setResetModal((prev) => ({
                      ...prev,
                      customPassword: e.target.value,
                    }))
                  }
                  placeholder="Leave empty to auto-generate password"
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Leave blank to generate a secure 8-character random password.
                </span>
              </div>

              {/* Error Alert */}
              {resetModal.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{resetModal.error}</span>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setResetModal({
                      isOpen: false,
                      tatami: null,
                      customPassword: "",
                      loading: false,
                      error: "",
                    })
                  }
                  disabled={resetModal.loading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={resetModal.loading}
                  className="px-5 py-2.5 rounded-xl bg-[#3f4191] hover:bg-[#2e3b7e] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:bg-slate-400"
                >
                  {resetModal.loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>Confirm Reset</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TatamiPage;
