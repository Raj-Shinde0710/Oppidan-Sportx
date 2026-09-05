import { useEffect, useState } from 'react';
import { getTournaments } from '../api/tournaments';
import { Link } from 'react-router-dom';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    getTournaments().then(res => setTournaments(res.data));
  }, []);

  return (
    <div>
      <h1>Tournaments</h1>

      <Link to="/create">➕ Create Tournament</Link>

      <ul>
        {tournaments.map(t => (
          <li key={t.id}>
            <Link to={`/tournament/${t.id}`}>
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
