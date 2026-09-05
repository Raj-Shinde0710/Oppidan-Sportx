import { useEffect, useState } from 'react';
import { getPlayers, createPlayer } from '../api/players';

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');

  const load = async () => {
    const res = await getPlayers();
    setPlayers(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    await createPlayer({ name });
    load();
  };

  return (
    <div>
      <h1>Players</h1>

      <input
        placeholder="Player name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={add}>Add</button>

      <ul>
        {players.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
