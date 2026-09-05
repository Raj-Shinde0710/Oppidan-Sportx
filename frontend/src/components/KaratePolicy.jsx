import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Edit3,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import axios from "axios";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../api/categories";

const emptyForm = {
  poolCategoryName: "",
  startAge: "",
  endAge: "",
  participants: "",
  eventOption: "",
  gender: "BOTH",

  sortByBelt: false,
};

const emptyWeightForm = {
  minWeight: "",
  maxWeight: "",
};

const KaratePolicy = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState(emptyForm);
  const [formWeights, setFormWeights] = useState([]);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightTarget, setWeightTarget] = useState("create");
  const [weightForm, setWeightForm] = useState(emptyWeightForm);

  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editWeights, setEditWeights] = useState([]);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/tournaments");
        setTournaments(res.data || []);
      } catch (err) {
        console.error("Failed to fetch tournaments", err);
      }
    };

    fetchTournaments();
  }, []);

  useEffect(() => {
    if (!selectedTournamentId) {
      setPolicies([]);
      return;
    }

    loadPolicies(selectedTournamentId);
  }, [selectedTournamentId]);

  const loadPolicies = async (tournamentId) => {
    setLoadingPolicies(true);
    try {
      const data = await getCategories(tournamentId);
      setPolicies(data || []);
    } catch (err) {
      console.error("Failed to fetch karate policies", err);
      alert("Failed to load karate policies");
    } finally {
      setLoadingPolicies(false);
    }
  };

  const handleTournamentChange = (e) => {
    setSelectedTournamentId(e.target.value);
    setFormData(emptyForm);
    setFormWeights([]);
    closeEditModal();
  };

 const handleInputChange = (e) => {
  const { name, value, type, checked } = e.target;

  setFormData((prev) => ({
    ...prev,

    [name]:
      type === "checkbox"
        ? checked
        : value,

    ...(name === "eventOption" && value === "Kata"
      ? {
          gender: "BOTH",
        }
      : {}),
  }));
};

const handleEditInputChange = (e) => {
  const { name, value, type, checked } = e.target;

  setEditForm((prev) => ({
    ...prev,

    [name]:
      type === "checkbox"
        ? checked
        : value,

    ...(name === "eventOption" && value === "Kata"
      ? {
          gender: "BOTH",
        }
      : {}),
  }));
};
  const openWeightModal = (target) => {
    setWeightTarget(target);
    setWeightForm(emptyWeightForm);
    setShowWeightModal(true);
  };

  const handleSaveWeight = () => {
    const minWeight = Number(weightForm.minWeight);
    const maxWeight = Number(weightForm.maxWeight);

    if (!weightForm.minWeight || !weightForm.maxWeight) {
      alert("Please enter both min and max weight.");
      return;
    }

    if (maxWeight <= minWeight) {
      alert("Max weight must be greater than min weight.");
      return;
    }

    const newWeight = { minWeight, maxWeight };

    if (weightTarget === "edit") {
      setEditWeights((prev) => [...prev, newWeight]);
    } else {
      setFormWeights((prev) => [...prev, newWeight]);
    }

    setWeightForm(emptyWeightForm);
    setShowWeightModal(false);
  };

  const buildPayload = (data, weights) => ({
  name: data.poolCategoryName.trim(),
  minAge: Number(data.startAge),
  maxAge: Number(data.endAge),
  playersPerPool: Number(data.participants),
  gender: data.gender || "BOTH",
  type: data.eventOption.toUpperCase(),
  level: "",

  sortByBelt: data.sortByBelt || false,

  weights: data.eventOption === "Kumite" ? weights : [],
});

  const validateForm = (data) => {
    if (!selectedTournamentId) {
      alert("Please select a tournament first.");
      return false;
    }

    if (
      !data.poolCategoryName ||
      !data.startAge ||
      !data.endAge ||
      !data.participants ||
      !data.eventOption
    ) {
      alert("Please fill all policy fields.");
      return false;
    }

    if (Number(data.endAge) < Number(data.startAge)) {
      alert("End age must be greater than or equal to start age.");
      return false;
    }

    return true;
  };

  const handleAddCategory = async () => {
    if (!validateForm(formData)) return;

    setSaving(true);
    try {
      await createCategory(selectedTournamentId, buildPayload(formData, formWeights));
      await loadPolicies(selectedTournamentId);
      setFormData(emptyForm);
      setFormWeights([]);
      alert("Karate policy saved successfully");
    } catch (err) {
      console.error("Failed to save karate policy", err);
      alert("Failed to save karate policy");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (policy) => {
    setEditingPolicy(policy);
    setEditForm({
  poolCategoryName: policy.name || "",
  startAge: String(policy.minAge ?? ""),
  endAge: String(policy.maxAge ?? ""),
  participants: String(policy.playersPerPool ?? ""),
  eventOption: policy.type === "KATA" ? "Kata" : "Kumite",
  gender: policy.gender || "BOTH",

  sortByBelt: policy.sortByBelt ?? false,
});
    setEditWeights(
      (policy.weights || []).map((weight) => ({
        minWeight: Number(weight.minWeight),
        maxWeight: Number(weight.maxWeight),
      })),
    );
  };

  const closeEditModal = () => {
    setEditingPolicy(null);
    setEditForm(emptyForm);
    setEditWeights([]);
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicy || !validateForm(editForm)) return;

    setSaving(true);
    try {
      await updateCategory(
        selectedTournamentId,
        editingPolicy.id,
        buildPayload(editForm, editWeights),
      );
      await loadPolicies(selectedTournamentId);
      closeEditModal();
      alert("Karate policy updated successfully");
    } catch (err) {
      console.error("Failed to update karate policy", err);
      alert("Failed to update karate policy");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm("Delete this karate policy?")) return;

    try {
      await deleteCategory(selectedTournamentId, policyId);
      await loadPolicies(selectedTournamentId);
    } catch (err) {
      console.error("Failed to delete karate policy", err);
      alert("Failed to delete karate policy");
    }
  };

  const removeFormWeight = (index) => {
    setFormWeights((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditWeight = (index) => {
    setEditWeights((prev) => prev.filter((_, i) => i !== index));
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5 } },
  };

  const renderWeightList = (weights, onRemove) => (
    <div className="space-y-2">
      {weights.length === 0 && <p className="text-xs font-bold text-slate-400">No weight ranges</p>}
      {weights.map((weight, index) => (
        <div key={`${weight.minWeight}-${weight.maxWeight}-${index}`} className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-2 text-xs font-black text-slate-600">
          <span>{weight.minWeight}-{weight.maxWeight} kg</span>
          <button type="button" onClick={() => onRemove(index)} className="text-slate-400 hover:text-rose-500">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  const renderPolicyFields = (data, onChange, weights, removeWeight, weightButtonTarget) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
      <div className="md:col-span-2">
        <label className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-3 ml-1">Pool Category Name</label>
        <input name="poolCategoryName" value={data.poolCategoryName} onChange={onChange} type="text" placeholder="e.g. Sub-Junior Kumite" className="w-full bg-white/20 border-b-2 border-slate-300 py-3 outline-none focus:border-[#3f4191] transition-all text-2xl font-bold placeholder:text-slate-300" />
      </div>

      <div className="space-y-6 bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm">
        <div className="flex items-center gap-2 text-[#3f4191]"><Users size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Age Range</span></div>
        <div className="grid grid-cols-2 gap-6">
          <input name="startAge" value={data.startAge} onChange={onChange} type="number" placeholder="Min" className="w-full bg-white/60 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#3f4191]" />
          <input name="endAge" value={data.endAge} onChange={onChange} type="number" placeholder="Max" className="w-full bg-white/60 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#3f4191]" />
        </div>
      </div>

      <div className="space-y-6 bg-white/30 p-6 rounded-[2rem] border border-white/40 shadow-sm">
        <div className="flex items-center gap-2 text-[#3f4191]"><UserPlus size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Participants</span></div>
        <input name="participants" value={data.participants} onChange={onChange} type="number" placeholder="No. in Pool" className="w-full bg-white/60 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:border-[#3f4191]" />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-4 ml-1">Option</label>
        <div className="flex gap-4">
          {["Kata", "Kumite"].map((option) => (
            <label key={option} className="flex-1 cursor-pointer">
              <input type="radio" name="eventOption" value={option} checked={data.eventOption === option} onChange={onChange} className="hidden peer" />
              <div className="bg-white/40 border border-white/60 p-4 rounded-2xl text-center text-xs font-black uppercase tracking-widest peer-checked:bg-[#3f4191] peer-checked:text-white transition-all">{option}</div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-4 ml-1">Gender</label>
        <select name="gender" value={data.gender} onChange={onChange} className="w-full bg-white/50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-[#3f4191] font-bold text-sm">
          <option value="BOTH">Both</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </div>

      {data.eventOption === "Kumite" && (
        <div className="md:col-span-2 rounded-[2rem] bg-white/30 border border-white/40 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#3f4191]">Weight Ranges</span>
            <button type="button" onClick={() => openWeightModal(weightButtonTarget)} className="inline-flex items-center gap-2 rounded-xl bg-white/60 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#3f4191] border border-white/60">
              <Plus size={14} /> Add Weight
            </button>
          </div>
          {renderWeightList(weights, removeWeight)}
        </div>
      )}
      {(data.eventOption === "Kata" || data.eventOption === "Kumite") && (
  <div className="md:col-span-2 rounded-[2rem] bg-white/30 border border-white/40 p-6 shadow-sm">
    <label className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-4">
      Pool Generation Method
    </label>

    <div className="flex gap-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="sortByBelt"
          checked={!data.sortByBelt}
          onChange={() =>
            onChange({
              target: {
                name: "sortByBelt",
                value: false,
              },
            })
          }
        />
        Random
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="sortByBelt"
          checked={data.sortByBelt}
          onChange={() =>
            onChange({
              target: {
                name: "sortByBelt",
                value: true,
              },
            })
          }
        />
        Strict Belt Wise
      </label>
    </div>
  </div>
)}
    </div>
  );

  return (
    <div className="relative">
      <div className={showWeightModal || editingPolicy ? "blur-sm pointer-events-none transition-all duration-300" : ""}>
        <div className="min-h-screen bg-[#f1f5f9] bg-[radial-gradient(at_top_left,_#e2e8f0_0%,_transparent_50%),_radial-gradient(at_top_right,_#cbd5e1_0%,_transparent_50%)] p-4 md:p-10 font-sans text-slate-700 flex flex-col items-center">
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full max-w-4xl bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-xl mb-10 overflow-hidden">
            <div className="p-10 border-b border-white/30 flex flex-col md:flex-row md:items-center gap-6">
              <motion.div variants={itemVariants} className="bg-[#3f4191] w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <ShieldCheck size={36} />
              </motion.div>
              <div>
                <motion.h1 variants={itemVariants} className="text-4xl font-black text-[#1e266d] tracking-tighter">Karate Policy</motion.h1>
                <motion.p variants={itemVariants} className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Configure Pool Categories</motion.p>
              </div>
            </div>

            <div className="p-10 space-y-10">
              <motion.div variants={itemVariants}>
                <label className="block text-[11px] uppercase tracking-[0.25em] font-black text-slate-400 mb-4 ml-1">Tournament Name</label>
                <div className="relative">
                  <select value={selectedTournamentId} onChange={handleTournamentChange} className="w-full bg-white/50 border border-slate-200 rounded-2xl p-4 pl-12 outline-none focus:border-[#3f4191] font-bold text-sm">
                    <option value="">Select Tournament</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                    ))}
                  </select>
                  <Trophy className="absolute left-4 top-4 text-[#3f4191]" size={20} />
                </div>
              </motion.div>

              {renderPolicyFields(formData, handleInputChange, formWeights, removeFormWeight, "create")}
            </div>

            <div className="p-6 border-t border-white/30 flex justify-end bg-white/10">
              <motion.button disabled={saving} onClick={handleAddCategory} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#3f4191] disabled:opacity-50 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                {saving ? "Saving..." : "Add Policy"} <ChevronRight size={18} />
              </motion.button>
            </div>
          </motion.div>

          {selectedTournamentId && (
            <div className="w-full max-w-4xl flex flex-col gap-6 pb-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#1e266d] tracking-tight">Saved Karate Policies</h2>
                  <p className="text-[10px] uppercase tracking-[0.25em] font-black text-slate-400 mt-1">Selected Tournament</p>
                </div>
                {loadingPolicies && <span className="text-xs font-black uppercase tracking-widest text-slate-400">Loading...</span>}
              </div>

              <div className="bg-white/30 backdrop-blur-md rounded-3xl overflow-hidden shadow-xl border border-white/40">
                <table className="w-full text-left">
                  <thead className="bg-white/20 border-b border-white/30">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1e266d]">Name</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1e266d]">Age</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1e266d]">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1e266d]">Players</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1e266d]">Weight</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1e266d] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {policies.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-sm font-bold text-slate-400">No karate policies saved for this tournament yet.</td>
                      </tr>
                    )}
                    {policies.map((policy) => (
                      <tr key={policy.id} className="hover:bg-white/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-[#1e266d]">{policy.name}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{policy.minAge}-{policy.maxAge} yrs</td>
                        <td className="px-6 py-4 text-xs font-black text-slate-500">{policy.type}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{policy.playersPerPool}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">
                          {policy.type === "KATA" || !policy.weights?.length
                            ? "-"
                            : policy.weights.map((weight) => `${weight.minWeight}-${weight.maxWeight} kg`).join(", ")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => openEditModal(policy)} className="text-slate-400 hover:text-[#3f4191] transition-all" title="Edit policy">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleDeletePolicy(policy.id)} className="text-slate-400 hover:text-rose-500 transition-all" title="Delete policy">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showWeightModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-slate-100" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xl text-[#1e266d]">Add Weight Range</h3>
                <X onClick={() => setShowWeightModal(false)} className="cursor-pointer text-slate-400 hover:text-rose-500 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <input type="number" placeholder="Min kg" value={weightForm.minWeight} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-[#3f4191] font-bold" onChange={(e) => setWeightForm({ ...weightForm, minWeight: e.target.value })} />
                <input type="number" placeholder="Max kg" value={weightForm.maxWeight} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-[#3f4191] font-bold" onChange={(e) => setWeightForm({ ...weightForm, maxWeight: e.target.value })} />
              </div>
              <button onClick={handleSaveWeight} className="w-full bg-[#3f4191] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-[#1e266d] transition-all">
                Save Weight
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingPolicy && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-[2rem] p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100" initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-black text-2xl text-[#1e266d]">Edit Karate Policy</h3>
                  <p className="text-[10px] uppercase tracking-[0.25em] font-black text-slate-400 mt-1">All fields are editable</p>
                </div>
                <X onClick={closeEditModal} className="cursor-pointer text-slate-400 hover:text-rose-500 transition-colors" />
              </div>

              {renderPolicyFields(editForm, handleEditInputChange, editWeights, removeEditWeight, "edit")}

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <button onClick={closeEditModal} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                  Cancel
                </button>
                <button disabled={saving} onClick={handleUpdatePolicy} className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-[#3f4191] text-white disabled:opacity-50 flex items-center gap-2">
                  <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KaratePolicy;
