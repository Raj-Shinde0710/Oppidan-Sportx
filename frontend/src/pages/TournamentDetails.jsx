import { useEffect, useState } from 'react';
import { useParams,useNavigate } from 'react-router-dom';
import {
  getTournamentById,
  generatePools
} from '../api/tournaments';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate=useNavigate;
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadTournament = async () => {
    const data = await getTournamentById(id);
    setTournament(data);
  };

  useEffect(() => {
    loadTournament();
  }, []);

  const handleGeneratePools = async () => {
    setLoading(true);
    await generatePools(id);
    await loadTournament();
    setLoading(false);
  };

  if (!tournament) return <p>Loading...</p>;

  return (
    <div>
      <h1>{tournament.name}</h1>
      <button
  onClick={() => navigate(`/karate-policy/${tournament.id}`)}
  className="bg-[#3f4191] text-white px-6 py-3 rounded-xl font-bold"
>
  Create Karate Policy
</button>

      <button onClick={handleGeneratePools}>
        {loading ? 'Generating...' : 'Generate AI Pools'}
      </button>
    </div>
  );
}
