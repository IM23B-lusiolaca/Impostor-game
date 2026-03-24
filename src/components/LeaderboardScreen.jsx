'use client';

export default function LeaderboardScreen({ socket, room }) {
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('impostor_userId') : null;
  const isHost = room.hostId === myUserId;
  const winner = room.gameData.winner;

  // Sort players by score
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <div className="leaderboard-screen panel">
      <div className="winner-announcement">
         <h1 className={winner === 'IMPOSTORS' ? 'text-danger' : 'text-success'}>
            {winner === 'IMPOSTORS' ? 'IMPOSTOR WINS!' : 'NORMAL WINS!'}
         </h1>
      </div>

      <div className="leaderboard-container">
         <h3>Leaderboard</h3>
         <table className="leaderboard-table">
            <thead>
               <tr>
                  <th>Player</th>
                  <th>Score</th>
                  <th className="hide-mobile">Imp Wins</th>
                  <th className="hide-mobile">Norm Wins</th>
               </tr>
            </thead>
            <tbody>
               {sortedPlayers.map((p, index) => (
                  <tr key={p.userId} className={p.userId === myUserId ? 'me' : ''}>
                     <td className="player-col">
                        <span className="rank-badge">#{index + 1}</span>
                        <span className="ldr-avatar">{p.avatar}</span>
                        {p.name}
                     </td>
                     <td className="score-col">{p.score}</td>
                     <td className="hide-mobile">{p.impostorWins}</td>
                     <td className="hide-mobile">{p.normalWins}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {isHost ? (
         <div className="host-actions">
            <button className="btn-start" onClick={() => socket.emit('start_game')}>
               Start Next Round
            </button>
         </div>
      ) : (
         <p className="waiting-text">Waiting for host to start next round...</p>
      )}
    </div>
  );
}
