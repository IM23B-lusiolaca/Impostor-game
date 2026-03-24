'use client';
import { useState, useEffect } from 'react';

const AVATARS = ['😎', '👽', '🤠', '👻', '🤖', '🦊', '🐱', '🐶', '🦄', '🐸'];

export default function HomeScreen({ socket }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Attempt auto-reconnect if userId exists and we aren't in a room yet
    const storedUserId = localStorage.getItem('impostor_userId');
    const storedName = localStorage.getItem('impostor_name');
    const storedAvatar = localStorage.getItem('impostor_avatar');
    
    if (storedName) setName(storedName);
    if (storedAvatar) setAvatar(storedAvatar);
    
    // Auto-reconnect flow logic generally happens when a room code is known, 
    // but the client doesn't know the room code after a full refresh unless we store it.
    // Let's store last room code
    const storedRoom = localStorage.getItem('impostor_lastRoom');
    if (storedUserId && storedRoom) {
       socket.emit('join_room', { code: storedRoom, userId: storedUserId, name: storedName || 'Player', avatar: storedAvatar }, (res) => {
          if (res.error) {
             // Failed to auto-rejoin (room closed, etc), clear room
             localStorage.removeItem('impostor_lastRoom');
          }
       });
    }
  }, [socket]);

  const generateUserId = () => {
    let uid = localStorage.getItem('impostor_userId');
    if (!uid) {
       uid = Math.random().toString(36).substring(2, 15);
       localStorage.setItem('impostor_userId', uid);
    }
    return uid;
  };

  const handleCreate = () => {
    if (!name.trim()) return setError('Please enter your name');
    
    localStorage.setItem('impostor_name', name.trim());
    localStorage.setItem('impostor_avatar', avatar);
    const userId = generateUserId();

    socket.emit('create_room', { userId, name: name.trim(), avatar }, (res) => {
      if (res.error) setError(res.error);
      else localStorage.setItem('impostor_lastRoom', res.code);
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError('Please enter your name');
    if (!roomCode.trim() || roomCode.length !== 4) return setError('Please enter a 4-digit room code');
    
    localStorage.setItem('impostor_name', name.trim());
    localStorage.setItem('impostor_avatar', avatar);
    const userId = generateUserId();

    socket.emit('join_room', { code: roomCode.trim(), userId, name: name.trim(), avatar }, (res) => {
      if (res.error) setError(res.error);
      else localStorage.setItem('impostor_lastRoom', roomCode.trim());
    });
  };

  return (
    <div className="home-screen panel">
      <h1>The Impostor</h1>
      <p className="subtitle">A game of hidden identities and secret words</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="avatar-selection">
         <label>Choose Avatar</label>
         <div className="avatar-grid">
            {AVATARS.map(a => (
               <button 
                  key={a} 
                  className={`avatar-btn ${avatar === a ? 'selected' : ''}`}
                  onClick={() => setAvatar(a)}
               >
                  {a}
               </button>
            ))}
         </div>
      </div>

      <div className="input-group">
        <label>Your Name</label>
        <input 
           type="text" 
           placeholder="Enter your name" 
           value={name} 
           onChange={(e) => setName(e.target.value)}
           maxLength={15}
        />
      </div>

      <div className="action-group">
         <button onClick={handleCreate} className="btn-create">Create Room</button>
         
         <div className="divider"><span>OR</span></div>

         <div className="join-group">
            <input 
               type="text" 
               placeholder="4-Digit Code" 
               value={roomCode} 
               onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
               maxLength={4}
               className="code-input"
            />
            <button onClick={handleJoin} className="btn-join">Join Room</button>
         </div>
      </div>
    </div>
  );
}
