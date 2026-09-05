import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getIdCardsByTournament } from "../api/Idcards";
import { getTournaments } from "../api/tournaments";
import { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


export default function GenerateID() {
  const [openCard, setOpenCard] = useState(false);
  const [activeTournament, setActiveTournament] = useState(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [player, setPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tournaments, setTournaments] = useState([]);
  const cardRef= useRef();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const data = await getTournaments();
        if (Array.isArray(data)) setTournaments(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTournaments();
  }, []);

  const openModal = (tournament) => {
    setActiveTournament(tournament);
    setOpenCard(true);
  };

  const handleGenerateFromDropdown = async () => {
    const tournament = tournaments.find((t) => t.id === selectedTournamentId);
    if (!tournament) return;

    try {
      const data = await getIdCardsByTournament(selectedTournamentId);

      if (Array.isArray(data) && data.length > 0) {
        setPlayers(data);
        setCurrentIndex(0);
        setPlayer(data[0]);
        openModal(tournament);
      } else {
        alert("No players found for this tournament");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch ID cards");
    }
  };

  const nextPlayer = () => {
    if (currentIndex < players.length - 1) {
      const i = currentIndex + 1;
      setCurrentIndex(i);
      setPlayer(players[i]);
    }
  };

  const prevPlayer = () => {
    if (currentIndex > 0) {
      const i = currentIndex - 1;
      setCurrentIndex(i);
      setPlayer(players[i]);
    }
  };

  const downloadPDF = async () => {
  const input = cardRef.current;
  if (!input) return;

  const canvas = await html2canvas(input, { 
    scale: 3,
    useCORS:true,
    allowTaint:true 
});
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [320, 500], // size close to your card
  });

  pdf.addImage(imgData, "PNG", 0, 0, 320, 500);
  pdf.save(`${player.fullName}-ID-Card.pdf`);
};


  return (
    <div className="p-8 bg-[#f4f6fb] min-h-full">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Generate Athlete ID Cards
      </h1>

      <div className="flex items-center gap-4 mb-8">
        <select
          value={selectedTournamentId}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
          className="w-80 px-4 py-3 border rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select Tournament</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <button
          disabled={!selectedTournamentId}
          onClick={handleGenerateFromDropdown}
          className="px-6 py-3 rounded-xl bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          Generate IDs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl shadow-md p-6 border">
            <h2 className="text-lg font-semibold text-indigo-800">{t.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">{t.venue}</p>

            <button
              onClick={() => {
                setSelectedTournamentId(t.id);
                handleGenerateFromDropdown();
              }}
              className="mt-4 w-full h-10 rounded-xl bg-indigo-700 text-white text-sm font-semibold hover:bg-indigo-800 transition"
            >
              Generate All IDs
            </button>
          </div>
        ))}
      </div>

      {openCard && player && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div ref ={cardRef}className="w-[320px] bg-white rounded-2xl shadow-2xl relative overflow-hidden">

            <button
              onClick={() => setOpenCard(false)}
              className="absolute top-3 right-3 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center"
            >
              <X size={14} />
            </button>

            <div className="py-3 border-b text-center">
              <h2 className="text-sm font-bold tracking-wide">
                WORLD KARATE FEDERATION
              </h2>
            </div>

            <div className="p-4">
              <p className="text-[11px] text-gray-500 text-center mb-2">
                {activeTournament?.name}
              </p>

              <div className="flex gap-4">
                <img
                  src={player.photoUrl}
                  alt="athlete"
                  className="w-20 h-24 rounded-lg object-cover border"
                />

                <div className="flex-1 text-xs space-y-1">
                  <p className="uppercase text-gray-400 text-[10px] font-semibold">Athlete</p>
                  <p className="font-bold text-sm">{player.fullName}</p>
                  <p className="text-gray-500">{player.playerId}</p>
                  <p>{new Date(player.dob).toLocaleDateString()}</p>
                  <p>{player.state}</p>
                  <p className="font-medium">{player.belt} Belt</p>
                </div>

                <div className="text-[10px] text-gray-400 text-right">
                  <p className="font-semibold text-gray-700">DAY 1</p>
                  <p>DAY 2</p>
                  <p>DAY 3</p>
                </div>
              </div>

              <div className="flex justify-center mt-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${window.location.origin}/verify/${player.playerId}`}
                  alt="qr"
                  className="w-24 h-24"
                />
              </div>

              {/* Player Navigation */}
              <div className="flex justify-between mt-3 px-2">
                <button
                  onClick={prevPlayer}
                  disabled={currentIndex === 0}
                  className="text-xs px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <p className="text-xs text-gray-500">
                  {currentIndex + 1} / {players.length}
                </p>
                <button
                  onClick={nextPlayer}
                  disabled={currentIndex === players.length - 1}
                  className="text-xs px-3 py-1 bg-gray-200 rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="bg-gray-100 px-4 py-3">
              <p className="text-[10px] font-semibold mb-2">ACCESS (TATAMI)</p>

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <span
                    key={n}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-semibold
                      ${player.tatamis?.includes(n)
                        ? "bg-black text-white"
                        : "bg-gray-300 text-gray-600"
                      }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
              {/* ⬇⬇ ADD THIS BUTTON HERE ⬇⬇ */}
              <button
                onClick={downloadPDF}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-semibold transition"
              >
                Export as PDF
            </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
