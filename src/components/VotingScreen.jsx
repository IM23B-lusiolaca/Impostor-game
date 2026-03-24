'use client';
import { useState } from 'react';

export default function VotingScreen({ socket, room }) {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Read local userId
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('impostor_userId') : null;
  const me = room.players.find(p => p.userId === myUserId);
  const isSpectator = me?.isSpectator;

  // Filter players excluding myself, offline players, and spectators, so I can't vote for myself or dead ones
  const activePlayers = room.players.filter(p => !p.isSpectator && p.isOnline);
  const votablePlayers = activePlayers.filter(p => p.userId !== myUserId);

  const handleVote = () => {
    if (!selectedUserId) return;
    socket.emit('submit_vote', selectedUserId);
    setHasVoted(true);
  };

  const voteCount = room.gameData.votesCount;
  const totalVotesNeeded = activePlayers.length;

  return (
    <div className="voting-screen panel">
      <h2>Time to Vote!</h2>
      <p className="subtitle">Who is the Impostor?</p>

      {isSpectator ? (
         <div className="spectator-mode">
            <h3>You are spectating</h3>
            <p>Wait for the active players to finish voting.</p>
         </div>
      ) : (
         <>
         {!hasVoted ? (
            <div className="voting-action">
               <div className="vote-grid">
                  {votablePlayers.map(p => (
                     <button
                        key={p.userId}
                        className={`vote-card ${selectedUserId === p.userId ? 'selected' : ''}`}
                        onClick={() => setSelectedUserId(p.userId)}
                     >
                        <span className="vote-avatar">{p.avatar}</span>
                        <span className="vote-name">{p.name}</span>
                     </button>
                  ))}
               </div>

               <button 
                  className="btn-vote" 
                  onClick={handleVote} 
                  disabled={!selectedUserId}
               >
                  Cast Vote
               </button>
            </div>
         ) : (
            <div className="waiting-votes">
               <div className="spinner"></div>
               <h3>Waiting for others...</h3>
               <p>{voteCount} / {totalVotesNeeded} votes cast</p>
            </div>
         )}
         </>
      )}
    </div>
  );
}
