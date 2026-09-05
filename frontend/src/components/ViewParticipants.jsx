import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { getAllTournaments } from "../api/tournaments";
import { getAllPlayers } from "../api/players";
import AddParticipantModal from "./AddParticipantModal";
import * as XLSX from "xlsx"; 
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import axios from "axios";

const normalizeHeader = (value = "") =>
  String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const getCellValue = (row, candidates) => {
  const normalizedRow = Object.entries(row ?? {}).reduce((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});

  for (const candidate of candidates) {
    const value = normalizedRow[normalizeHeader(candidate)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
};

const normalizeGender = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["male", "m", "boy", "gentleman"].includes(normalized)) return "MALE";
  if (["female", "f", "girl", "lady"].includes(normalized)) return "FEMALE";
  if (["both", "mixed", "all"].includes(normalized)) return "BOTH";

  return "MALE";
};
const calculateAge = (dob) => {
  if (!dob) return "";

  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};
export default function ViewParticipants() {
  const [search, setSearch] = useState("");
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [participants, setParticipants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const fileInput = useRef(null);
  useEffect(() => {
    getAllTournaments()
      .then((data) => {
        setTournaments(Array.isArray(data) ? data : []);
      })
      .catch(() => setTournaments([]));
  }, []);

  const loadPlayers = async () => {
    try {
      const data = await getAllPlayers();
      if (Array.isArray(data)) {
        setParticipants(data);
      } else {
        console.warn("Unexpected players payload", data);
      }
    } catch (err) {
      console.error(err);
    }
  };

const handleExcel = async (e) => {
  const file = e.target.files?.[0];

  if (!file) return;
  if (!selectedTournamentId) {
    alert("Please select a tournament before importing participants.");
    return;
  }

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
const sheetName = workbook.SheetNames.includes("Participants")
  ? "Participants"
  : workbook.SheetNames[0];

const sheet = workbook.Sheets[sheetName];    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      console.log(rows);
console.log("Rows:", rows.length);

    const payload = rows
     .filter((row) => {
    console.log("Current Row:", row);

    const name = getCellValue(row, [
      "name",
      "participantname",
      "full name",
      "full_name",
      "playername",
    ]);

    console.log("Name:", name);

    return String(name).trim() !== "";
})
      .map((row) => {
        const dob = getCellValue(row, ["dob", "dateofbirth", "date of birth"]);

let normalizedDob = "";

if (typeof dob === "number") {
  // Excel serial number
  const excelDate = new Date(Math.round((dob - 25569) * 86400 * 1000));
  normalizedDob = excelDate.toISOString();
} else if (typeof dob === "string") {
  const parts = dob.split(/[\/\-]/);

  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    normalizedDob = new Date(year, month, day).toISOString();
  } else {
    const parsed = new Date(dob);

    if (!Number.isNaN(parsed.getTime())) {
      normalizedDob = parsed.toISOString();
    }
  }
}

if (!normalizedDob) {
  alert(`Invalid DOB found: ${dob}`);
  throw new Error(`Invalid DOB: ${dob}`);
}

        const weightValue = getCellValue(row, ["weight", "kg", "weightkg"]);
        const parsedWeight = weightValue === "" ? null : Number(weightValue);

        return {
          name: String(getCellValue(row, ["name", "participantname", "full name", "full_name", "playername"])).trim(),
          gender: normalizeGender(getCellValue(row, ["gender", "sex"])),
          dob: normalizedDob,
          weight: Number.isFinite(parsedWeight) ? parsedWeight : null,
          belt: String(getCellValue(row, ["belt", "rank"])).trim(),
          email: String(getCellValue(row, ["email", "emailid", "email address"])).trim(),
          phone: String(getCellValue(row, ["phone", "mobile", "mobilenumber"])).trim(),
          club: String(getCellValue(row, ["club", "clubname"])).trim(),
          branch: String(getCellValue(row, ["branch", "clubbranch"])).trim(),
          state: String(getCellValue(row, ["state", "stateprovince"])).trim(),
          city: String(getCellValue(row, ["city", "town"])).trim(),
          tournamentId: selectedTournamentId,
        };
      });

    if (payload.length === 0) {
      alert("No valid participant rows were found in the selected file.");
      return;
    }

    await axios.post("http://localhost:3000/api/players/import", payload);
    alert(`Imported ${payload.length} participant(s) successfully`);
    e.target.value = "";
    await loadPlayers();
  } catch (err) {
    console.error(err);
    alert("Unable to import participants. Please check the Excel format and try again.");
  }
};

const downloadTemplate = async () => {

  const workbook = new ExcelJS.Workbook();

  // ======================================================
// LOOKUP SHEET (Hidden)
// ======================================================

const lookup = workbook.addWorksheet("Lookup");

const STATES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Tezpur"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Bhilai", "Korba"],
  "Goa": ["Panaji", "Margao", "Mapusa", "Vasco da Gama", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Shivamogga"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kannur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": [
    "Ahmednagar",
    "Akola",
    "Amravati",
    "Aurangabad",
    "Beed",
    "Bhandara",
    "Buldhana",
    "Chandrapur",
    "Dhule",
    "Gadchiroli",
    "Gondia",
    "Hingoli",
    "Jalgaon",
    "Jalna",
    "Kolhapur",
    "Latur",
    "Mumbai",
    "Nagpur",
    "Nanded",
    "Nandurbar",
    "Nashik",
    "Osmanabad",
    "Palghar",
    "Parbhani",
    "Pune",
    "Raigad",
    "Ratnagiri",
    "Sangli",
    "Satara",
    "Sindhudurg",
    "Solapur",
    "Thane",
    "Wardha",
    "Washim",
    "Yavatmal"
  ],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongstoin"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Serchhip"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Wokha"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur", "Puri"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Noida", "Ghaziabad"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Haldwani", "Roorkee", "Rudrapur"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],

  // Union Territories
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "Dwarka", "Rohini"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"]
};

lookup.getCell("A1").value = "States";

const stateNames = Object.keys(STATES);

stateNames.forEach((state, index) => {
  lookup.getCell(`A${index + 2}`).value = state;
});

let column = 2;

function getExcelColumnName(num) {
  let columnName = "";

  while (num > 0) {
    const rem = (num - 1) % 26;
    columnName = String.fromCharCode(65 + rem) + columnName;
    num = Math.floor((num - 1) / 26);
  }

  return columnName;
}

for (const state of stateNames) {

const col = getExcelColumnName(column);

  lookup.getCell(`${col}1`).value = state.replace(/\s/g, "_");

  STATES[state].forEach((city, index) => {
    lookup.getCell(`${col}${index + 2}`).value = city;
  });

  

  column++;
}

lookup.state = "veryHidden";

  const worksheet = workbook.addWorksheet("Participants");

  worksheet.columns = [
    { header: "Name", key: "name", width: 28 },
    { header: "DOB", key: "dob", width: 18 },
    { header: "Gender", key: "gender", width: 15 },
    { header: "Weight (kg)", key: "weight", width: 15 },
    { header: "Belt", key: "belt", width: 18 },
    { header: "Club", key: "club", width: 20 },
    { header: "Branch", key: "branch", width: 20 },
    { header: "Email ID", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Event", key: "event", width: 20 },
    { header: "State", key: "state", width: 22 },
    { header: "City", key: "city", width: 22 },
  ];

  worksheet.getRow(1).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "1E3A8A" },
  };

  worksheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  worksheet.addRow({
    name: "Kirti Yadav",
    dob: new Date("2019-07-11"),
    gender: "Female",
    weight: 17,
    belt: "YELLOW",
    club: "PCMC",
    branch: "Pune",
    email: "kirti@gmail.com",
    phone: "8565953363",
    event: "IKL",
    state: "Maharashtra",
    city: "Pune",
  });

  worksheet.getColumn("dob").numFmt = "dd/mm/yyyy";

    // Freeze the header row
  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  // Dropdown options
  const genders = ["Male", "Female"];

  const belts = [
    "WHITE",
    "YELLOW",
    "YELLOW2",
    "ORANGE",
    "GREEN",
    "BLUE",
    "PURPLE",
    "PURPLE STRIPE",
    "BROWN",
    "BROWN2",
    "BLACK",
  ];

  // Apply validation to the next 500 rows
  for (let row = 2; row <= 501; row++) {

    // DOB
    worksheet.getCell(`B${row}`).numFmt = "dd/mm/yyyy";

  

    // Gender Dropdown
    worksheet.getCell(`C${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${genders.join(",")}"`],
    };

    // Weight
    worksheet.getCell(`D${row}`).dataValidation = {
      type: "decimal",
      operator: "greaterThan",
      formulae: [0],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Invalid Weight",
      error: "Weight must be greater than 0.",
    };

    // Belt Dropdown
   worksheet.getCell(`E${row}`).dataValidation = {
  type: "list",
  allowBlank: false,
  showErrorMessage: true,
  errorStyle: "stop",
  errorTitle: "Invalid Belt",
  error: "Please select a belt from the dropdown only.",
  formulae: [`"${belts.join(",")}"`],
};

    // Phone Number
    worksheet.getCell(`I${row}`).dataValidation = {
      type: "textLength",
      operator: "equal",
      formulae: [10],
      allowBlank: true,
      showErrorMessage: true,
      errorTitle: "Invalid Phone",
      error: "Phone number must contain exactly 10 digits.",
    };

   // ===========================
// State Dropdown
// ===========================
worksheet.getCell(`K${row}`).dataValidation = {
  type: "list",
  allowBlank: false,
  showErrorMessage: true,
  errorStyle: "stop",
  errorTitle: "Invalid State",
  error: "Please select a state from the dropdown.",
  formulae: [`Lookup!$A$2:$A$${stateNames.length + 1}`],
};

// ===========================
// City
// Editable (No Validation)
// ===========================
worksheet.getCell(`L${row}`).dataValidation = null;

  }

 

  // Download workbook
  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    "Participant_Template.xlsx"
  );
};

useEffect(() => {
  loadPlayers();
}, []);

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesTournament = selectedTournamentId
      ? p.tournamentId === selectedTournamentId
      : true;

    return matchesSearch && matchesTournament;
  });
console.log("Participants:", participants);
console.log("Filtered:", filteredParticipants);

  return (
    <div className="p-6 bg-slate-100 min-h-screen">

      {/* Header Controls */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        {/* Tournament Dropdown */}
        <select value={selectedTournamentId} onChange={(e) => setSelectedTournamentId(e.target.value)} className="w-full md:w-1/3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">Select Tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative w-full md:w-1/3">
          <Search
            className="absolute left-4 top-3.5 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search participant by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {/* Add Excel */}
        <div className="flex gap-2">

  <button
    onClick={downloadTemplate}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
  >
    ⬇ Download Template
  </button>

  <button
    onClick={() => fileInput.current.click()}
    disabled={!selectedTournamentId}
    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
  >
    📄 Import Excel
  </button>

</div>

<input
    ref={fileInput}
    type="file"
    accept=".xlsx,.xls,.csv"
    hidden
    onChange={handleExcel}
/>
        {/* Add Participant */}
        <button
          onClick={() => setShowModal(true)}
          disabled={!selectedTournamentId}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
        >
          + Add Participant
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-lg">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">DOB</th>
              <th className="px-4 py-3 text-left">Age</th>
              <th className="px-4 py-3 text-left">Gender</th>
              <th className="px-4 py-3 text-left">Weight (kg)</th>
              <th className="px-4 py-3 text-left">Belt</th>
              <th className="px-4 py-3 text-left">Club</th>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-left">Email ID</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">State</th>
              <th className="px-4 py-3 text-left">City</th>
            </tr>
          </thead>

          <tbody>
            {filteredParticipants.map((p) => {
             const age = calculateAge(p.dob);
              return (
                <tr
                  key={p.id}
                  className="border-b hover:bg-slate-50 transition"
                >
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3">
                    {new Date(p.dob).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{age}</td>
<td className="px-4 py-3">
  {p.gender === "MALE"
    ? "Male"
    : p.gender === "FEMALE"
    ? "Female"
    : p.gender}
</td>
                  <td className="px-4 py-3">{p.weight}</td>
                  <td className="px-4 py-3">{p.belt}</td>
                  <td className="px-4 py-3">{p.profile?.club}</td>
                  <td className="px-4 py-3">{p.profile?.branch}</td>
                  <td className="px-4 py-3">{p.profile?.email}</td>
                  <td className="px-4 py-3">{p.profile?.phone}</td>
                  <td className="px-4 py-3">{p.tournament?.name}</td>
                  <td className="px-4 py-3">{p.profile?.state}</td>
                  <td className="px-4 py-3">{p.profile?.city}</td>
                </tr>
              )
            })}

            {filteredParticipants.length === 0 && (
              <tr>
                <td
                  colSpan="13"
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No participants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
       {/* Add Participant Modal */}
      <AddParticipantModal
        open={showModal}
        onClose={() => setShowModal(false)}
        tournamentId={selectedTournamentId}
        refresh={loadPlayers}
      />
    </div>
  );
}
