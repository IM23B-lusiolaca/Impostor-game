'use client';
import { useState, useEffect } from 'react';

export default function DiscussionScreen({ socket, room }) {
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('impostor_userId') : null;
  const isHost = room.hostId === myUserId;
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!room.gameData.discussionEndTime) return;

    const interval = setInterval(() => {
       const remaining = Math.max(0, Math.floor((room.gameData.discussionEndTime - Date.now()) / 1000));
       setTimeLeft(remaining);

       if (remaining === 0 && isHost) {
          socket.emit('end_discussion');
          clearInterval(interval);
       }
    }, 1000);

    return () => clearInterval(interval);
  }, [room.gameData.discussionEndTime, isHost, socket]);

  return (
    <div className="discussion-screen panel">
      <h2>Discussion Phase</h2>
      <p className="subtitle">Discuss who the Impostor might be!</p>

      <div className="timer-display">
         <div className={`timer-circle ${timeLeft <= 10 ? 'timer-danger' : ''}`}>
            {timeLeft}s
         </div>
      </div>

      <div className="word-history discussion-history">
         <h3>Submitted Words Reference</h3>
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

      {isHost && (
         <button className="btn-skip" onClick={() => socket.emit('end_discussion')}>
            Skip to Voting
         </button>
      )}
    </div>
  );
}
