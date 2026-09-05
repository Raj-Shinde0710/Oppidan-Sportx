import { useState } from "react";
import { createTournament } from "../api/tournaments";
import { useNavigate } from "react-router-dom";

console.log("CreateTournament component loaded");

export default function CreateTournament() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
    sportId: "",
    createdBy: "",
  });

  const [logo, setLogo] = useState(null);
  const [brochure, setBrochure] = useState(null);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // core logic stays
    console.log("HANDLE SUBMIT CALLED");

    const formData = new FormData();

    // same data, just packed correctly
    formData.append("name", form.name);
    formData.append("location", form.location);
    formData.append("startDate", form.startDate);
    formData.append("endDate", form.endDate);
    formData.append("sportId", form.sportId);
    formData.append("createdBy", form.createdBy);

    if (logo) formData.append("logo", logo);
    if (brochure) formData.append("brochure", brochure);

    try {
      const res = await createTournament(formData);
      console.log("Created:", res);
      navigate(`/tournament/${res.id}`);
    } catch (err) {
      console.error("Create failed", err);
      alert("Create failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create Tournament</h1>

      <input name="name" placeholder="Name" onChange={handleChange} />
      <input name="location" placeholder="Location" onChange={handleChange} />
      <input type="date" name="startDate" onChange={handleChange} />
      <input type="date" name="endDate" onChange={handleChange} />
      <input name="sportId" placeholder="Sport ID" onChange={handleChange} />
      <input name="createdBy" placeholder="Admin ID" onChange={handleChange} />

      {/* file inputs – minimal change */}
      <div>
        <label>Upload Logo / Banner</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setLogo(e.target.files[0])}
        />
      </div>

      <div>
        <label>Upload Brochure</label>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => setBrochure(e.target.files[0])}
        />
      </div>

      {/* ✅ ONLY submit, no onClick */}
      <button type="submit">Create</button>
    </form>
  );
}
