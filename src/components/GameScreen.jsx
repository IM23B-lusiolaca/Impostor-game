'use client';
import { useState, useEffect } from 'react';

export default function GameScreen({ socket, room, privateData }) {
  const [wordInput, setWordInput] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const [timeLeft, setTimeLeft] = useState(room.settings.turnTimeLength);

  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('impostor_userId') : null;
  const currentUserId = room.gameData.turnOrder[room.gameData.currentTurnIndex];
  const isMyTurn = myUserId === currentUserId;
  const currentPlayer = room.players.find(p => p.userId === currentUserId);
  const me = room.players.find(p => p.userId === myUserId);
  const isSpectator = me?.isSpectator;

  // Sync turn timer
  useEffect(() => {
    if (!room.gameData.turnEndTime) return;
    
    const interval = setInterval(() => {
       const remaining = Math.max(0, Math.floor((room.gameData.turnEndTime - Date.now()) / 1000));
       setTimeLeft(remaining);

       if (remaining === 0 && isMyTurn) {
          socket.emit('force_skip_turn');
       }
    }, 500);

    return () => clearInterval(interval);
  }, [room.gameData.turnEndTime, isMyTurn, socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!wordInput.trim()) return setErrorLocal('Please enter a word');
    
    socket.emit('submit_word', wordInput.trim());
    setWordInput('');
    setErrorLocal('');
  };

  return (
    <div className="game-screen panel">
      {isSpectator ? (
         <div className="spectator-mode">
            <h3>You are spectating</h3>
            <p>Wait for the next round to join the game.</p>
         </div>
      ) : (
         <div className="secret-word-panel">
            {privateData.role === 'IMPOSTOR' ? (
               <div className="impostor-view">
                  <h2 className="text-danger">YOU ARE THE IMPOSTOR</h2>
                  {privateData.hint && (
                     <div className="hint-box">
                        <p>{room.settings.similarWordMode ? 'A similar word is:' : 'Hint:'}</p>
                        <h3>{privateData.hint}</h3>
                     </div>
                  )}
               </div>
            ) : (
               <div className="normal-view">
                 <h2>Secret Word:</h2>
                 <h1 className="the-word">{privateData.secretWord}</h1>
               </div>
            )}
         </div>
      )}

      <div className="turn-indicator">
         <h3>
            {isMyTurn ? <span className="highlight-my-turn">It's your turn!</span> : `${currentPlayer?.name}'s turn`}
         </h3>
         <div className="timer-bar-container">
            <div 
               className={`timer-bar ${timeLeft <= 5 ? 'timer-danger' : ''}`}
               style={{ width: `${(timeLeft / room.settings.turnTimeLength) * 100}%` }}
            ></div>
         </div>
         <p className="time-text">{timeLeft}s remaining</p>
      </div>

      <div className="word-history">
         <h3>Submitted Clues (Round {room.gameData.currentRound} / {room.settings.clueRounds})</h3>
         <ul className="submissions-list">
            {room.gameData.wordHistory.map((sub, i) => {
               const player = room.players.find(p => p.userId === sub.userId);
               return (
                  <li key={i} className={`submission-item ${sub.userId === myUserId ? 'my-submission' : ''}`}>
                     <span className="sub-avatar">{player?.avatar}</span>
                     <span className="sub-name">{player?.name}</span>
                     <span className="sub-word">{sub.word}</span>
                  </li>
               )
            })}
         </ul>
      </div>

      {isMyTurn && (
         <form onSubmit={handleSubmit} className="turn-action">
            <input 
               type="text" 
               placeholder="Enter your one-word clue..." 
               value={wordInput}
               onChange={(e) => setWordInput(e.target.value)}
               autoFocus
               maxLength={20}
            />
            <button type="submit" className="btn-submit">Submit Word</button>
            {errorLocal && <p className="error-message">{errorLocal}</p>}
         </form>
      )}
    </div>
  );
}
