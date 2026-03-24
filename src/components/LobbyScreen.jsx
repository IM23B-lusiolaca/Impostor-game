'use client';

export default function LobbyScreen({ socket, room }) {
  // Use localStorage userId to determine if I am the host
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('impostor_userId') : null;
  const isHost = room.hostId === myUserId;

  const handleStart = () => {
    socket.emit('start_game');
  };

  const updateSetting = (key, value) => {
    socket.emit('update_settings', { [key]: value });
  };

  return (
    <div className="lobby-screen panel">
      <div className="lobby-header">
         <h2>Room Code: <span className="highlight-code">{room.code}</span></h2>
         <p className="player-count">{room.players.filter(p => p.isOnline).length} / {room.settings.maxPlayers} Players</p>
      </div>

      <div className="lobby-content">
         <div className="player-list-section">
            <h3>Players</h3>
            <ul className="player-list">
               {room.players.map(p => (
                  <li key={p.userId} className={`${p.userId === myUserId ? 'me' : ''} ${!p.isOnline ? 'offline' : ''}`}>
                     <span className="player-avatar">{p.avatar}</span>
                     <span className="player-name">{p.name}</span>
                     {p.userId === room.hostId && <span className="host-badge">👑</span>}
                     {!p.isOnline && <span className="offline-badge">Disconnected</span>}
                  </li>
               ))}
            </ul>
         </div>

         {isHost ? (
            <div className="host-controls">
               <h3>Host Settings</h3>
               
               <div className="settings-grid">
                  <div className="setting-group">
                     <label>Max Players:</label>
                     <select 
                        value={room.settings.maxPlayers} 
                        onChange={(e) => updateSetting('maxPlayers', parseInt(e.target.value))}
                     >
                        {[...Array(7)].map((_, i) => (
                           <option key={i+4} value={i+4}>{i+4}</option>
                        ))}
                     </select>
                  </div>
                  
                  <div className="setting-group">
                     <label>Impostors:</label>
                     <select 
                        value={room.settings.impostorCount} 
                        onChange={(e) => updateSetting('impostorCount', parseInt(e.target.value))}
                     >
                        {[1, 2, 3].map(num => (
                           <option key={num} value={num}>{num}</option>
                        ))}
                     </select>
                  </div>

                  <div className="setting-group">
                     <label>Category:</label>
                     <select 
                        value={room.settings.category} 
                        onChange={(e) => updateSetting('category', e.target.value)}
                     >
                        <option value="random">Random Various</option>
                        <option value="animals">Animals</option>
                        <option value="food">Food</option>
                        <option value="technology">Technology</option>
                        <option value="movies">Movies</option>
                     </select>
                  </div>

                  <div className="setting-group">
                     <label>Clue Rounds:</label>
                     <select 
                        value={room.settings.clueRounds} 
                        onChange={(e) => updateSetting('clueRounds', parseInt(e.target.value))}
                     >
                        <option value={1}>1 Round</option>
                        <option value={2}>2 Rounds</option>
                        <option value={3}>3 Rounds</option>
                     </select>
                  </div>

                  <div className="setting-group">
                     <label>Turn Timer:</label>
                     <select 
                        value={room.settings.turnTimeLength} 
                        onChange={(e) => updateSetting('turnTimeLength', parseInt(e.target.value))}
                     >
                        <option value={15}>15 Seconds</option>
                        <option value={20}>20 Seconds</option>
                        <option value={30}>30 Seconds</option>
                     </select>
                  </div>
               </div>

               <div className="toggles-group">
                  <div className="setting-group checkbox">
                     <label>
                        <input 
                           type="checkbox" 
                           checked={room.settings.hintsEnabled} 
                           onChange={(e) => updateSetting('hintsEnabled', e.target.checked)} 
                        />
                        Impostors get a hint
                     </label>
                  </div>

                  <div className="setting-group checkbox">
                     <label>
                        <input 
                           type="checkbox" 
                           checked={room.settings.similarWordMode} 
                           onChange={(e) => updateSetting('similarWordMode', e.target.checked)} 
                        />
                        Similar Word Mode (No hints)
                     </label>
                  </div>
               </div>

               <button 
                  onClick={handleStart} 
                  className="btn-start"
                  disabled={room.players.filter(p=>p.isOnline).length < 3}
               >
                  Start Game {room.players.filter(p=>p.isOnline).length < 3 ? '(Need 3+)' : ''}
               </button>
            </div>
         ) : (
            <div className="waiting-host">
               <div className="spinner"></div>
               <p>Waiting for host to start the game...</p>
               <div className="settings-preview">
                  <p>Category: {room.settings.category}</p>
                  <p>Impostors: {room.settings.impostorCount}</p>
                  <p>Rounds: {room.settings.clueRounds}</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
