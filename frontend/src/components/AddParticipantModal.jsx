import { useState } from "react";
import { createPlayer } from "../api/players";

export default function AddParticipantModal({
  open,
  onClose,
  tournamentId,
  refresh,
}) {
  const [form, setForm] = useState({
    name: "",
    dob: "",
    gender: "MALE",
    weight: "",
    belt: "",
    email: "",
    phone: "",
    club: "",
    branch: "",
    state: "",
    city: "",
  });

  if (!open) return null;

  const change = (e) =>
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  async function submit(e) {
    e.preventDefault();

    const payload = {
      name: form.name,
      gender: form.gender,
      dob: form.dob,
      weight: Number(form.weight),
      belt: form.belt,
      tournamentId,
      email: form.email,
      phone: form.phone,
      club: form.club,
      branch: form.branch,
      state: form.state,
      city: form.city,
    };

    console.log("Payload:", payload);

    try {
      await createPlayer(payload);

      alert("Participant Added");
      refresh();
      onClose();
    } catch (err) {
      console.log("Status:", err.response?.status);
      console.log("Full Response:", err.response?.data);
      console.log("Validation Messages:", err.response?.data?.message); console.log("Payload:", payload);
      console.error(err);
      alert("Unable to add participant");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl p-6 w-[650px] max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold mb-5">
          Add Participant
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <input
            name="name"
            placeholder="Name"
            onChange={change}
            className="border p-2 rounded"
            required
          />

          <input
            type="date"
            name="dob"
            onChange={change}
            className="border p-2 rounded"
            required
          />

          <select
            name="gender"
            onChange={change}
            className="border p-2 rounded"
          >
            <option>MALE</option>
            <option>FEMALE</option>
          </select>

          <input
            name="weight"
            type="number"
            placeholder="Weight"
            onChange={change}
            className="border p-2 rounded"
          />

          <input
            name="belt"
            placeholder="Belt"
            onChange={change}
            className="border p-2 rounded"
          />

          <input
            name="email"
            placeholder="Email"
            onChange={change}
            className="border p-2 rounded"
          />

          <input
            name="phone"
            placeholder="Phone"
            onChange={change}
            className="border p-2 rounded"
          />
          <input
            name="club"
            placeholder="Club"
            onChange={change}
            className="border p-2 rounded"
          />

          <input
            name="branch"
            placeholder="Branch"
            onChange={change}
            className="border p-2 rounded"
          />

          <input
            name="state"
            placeholder="State"
            onChange={change}
            className="border p-2 rounded"
          />

          <input
            name="city"
            placeholder="City"
            onChange={change}
            className="border p-2 rounded"
          />

        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded bg-gray-300"
          >
            Cancel
          </button>

          <button
            className="px-5 py-2 rounded bg-indigo-600 text-white"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}