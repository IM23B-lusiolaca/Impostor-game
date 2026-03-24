'use client';
import { useState, useEffect } from 'react';

export default function VoteRevealScreen({ socket, room }) {
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('impostor_userId') : null;
  const isHost = room.hostId === myUserId;
  const { voteEntries, eliminatedId, isEliminatedImpostor, voteCounts } = room.gameData.voteResults;
  
  const [revealedVotes, setRevealedVotes] = useState([]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    let timeouts = [];
    
    // Animate votes in one by one every 1.5 seconds
    voteEntries.forEach((vote, index) => {
       const timeoutId = setTimeout(() => {
          setRevealedVotes(prev => [...prev, vote]);
       }, (index + 1) * 1500);
       timeouts.push(timeoutId);
    });

    // Show the final result 2 seconds after the last vote
    const resultTimeout = setTimeout(() => {
       setShowResult(true);
    }, (voteEntries.length + 1) * 1500 + 500);
    timeouts.push(resultTimeout);

    return () => timeouts.forEach(clearTimeout);
  }, [voteEntries]);

  const eliminatedPlayer = room.players.find(p => p.userId === eliminatedId);

  return (
    <div className="vote-reveal-screen panel">
      <h2>Vote Reveal</h2>

      <div className="votes-container">
         {revealedVotes.map((vote, i) => {
            const voter = room.players.find(p => p.userId === vote.voterId);
            const target = room.players.find(p => p.userId === vote.targetId);
            return (
               <div key={i} className="vote-item animate-slide-in">
                  <span className="vote-avatar">{voter?.avatar}</span>
                  <span className="voter-name">{voter?.name}</span>
                  <span className="vote-arrow">voted for</span>
                  <span className="target-name">{target?.name}</span>
               </div>
            );
         })}
      </div>

      {!showResult && revealedVotes.length < voteEntries.length && (
         <div className="spinner reveal-spinner"></div>
      )}

      {showResult && (
         <div className="elimination-result animate-fade-in-up">
            <h3>
               <span className="result-avatar">{eliminatedPlayer?.avatar}</span> 
               {eliminatedPlayer?.name} was eliminated.
            </h3>
            
            <div className={`role-reveal-big ${isEliminatedImpostor ? 'is-impostor' : 'is-normal'} flip-animation`}>
               {eliminatedPlayer?.name} was {isEliminatedImpostor ? 'an IMPOSTOR!' : 'NOT an Impostor.'}
            </div>

            {isHost && (
               <button 
                  className="btn-proceed" 
                  onClick={() => socket.emit('proceed_vote_reveal')}
               >
                  Proceed
               </button>
            )}
         </div>
      )}
    </div>
  );
}
