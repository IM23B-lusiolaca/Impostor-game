'use client';
import { useState } from 'react';

export default function LastChanceScreen({ socket, room }) {
  const [guess, setGuess] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('impostor_userId') : null;
  const lastChancePlayerId = room.gameData.lastChanceUserId;
  const lastChancePlayer = room.players.find(p => p.userId === lastChancePlayerId);
  const isMyLastChance = myUserId === lastChancePlayerId;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guess.trim()) return setErrorLocal('Please enter a guess');
    socket.emit('submit_last_chance', guess.trim());
  };

  return (
    <div className="last-chance-screen panel">
      <h2 className="text-danger">LAST CHANCE!</h2>
      <p className="subtitle">
         {lastChancePlayer?.name} was the Impostor! But they have one final chance to steal the victory.
      </p>

      {isMyLastChance ? (
         <div className="last-chance-action">
            <h3>Guess the Secret Word!</h3>
            <p>If you guess it correctly, Impostors win.</p>
            <form onSubmit={handleSubmit} className="turn-action mt-2">
               <input 
                  type="text" 
                  placeholder="The secret word is..." 
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  autoFocus
               />
               <button type="submit" className="btn-vote">Steal Win</button>
            </form>
            {errorLocal && <p className="error-message">{errorLocal}</p>}
         </div>
      ) : (
         <div className="waiting-host">
            <div className="spinner-large timer-danger-border"></div>
            <p className="suspense-text">Waiting for {lastChancePlayer?.name} to guess...</p>
         </div>
      )}
    </div>
  );
}
