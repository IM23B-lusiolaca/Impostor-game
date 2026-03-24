'use client';
import { useEffect, useState } from 'react';
import { SocketProvider, useSocket } from '../contexts/SocketContext';
import HomeScreen from '../components/HomeScreen';
import LobbyScreen from '../components/LobbyScreen';
import GameScreen from '../components/GameScreen';
import VotingScreen from '../components/VotingScreen';
import LeaderboardScreen from '../components/LeaderboardScreen';
import DiscussionScreen from '../components/DiscussionScreen';
import VoteRevealScreen from '../components/VoteRevealScreen';
import LastChanceScreen from '../components/LastChanceScreen';

function GameContainer() {
  const socket = useSocket();
  const [room, setRoom] = useState(null);
  const [privateData, setPrivateData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!socket) return;
    
    socket.on('room_update', (roomData) => {
       setRoom(roomData);
       setErrorMsg(null);
    });

    socket.on('private_data', (data) => {
       setPrivateData(data);
    });

    socket.on('error_message', (msg) => {
       setErrorMsg(msg);
       setTimeout(() => setErrorMsg(null), 3000);
    });

    return () => {
       socket.off('room_update');
       socket.off('private_data');
       socket.off('error_message');
    };
  }, [socket]);

  if (!socket) {
    return <div className="loading-screen"><h2>Loading...</h2></div>;
  }

  if (!room) {
    return <HomeScreen socket={socket} />;
  }

  return (
     <div className="game-wrapper">
        {errorMsg && <div className="toast-error">{errorMsg}</div>}
        {room.state === 'LOBBY' && <LobbyScreen socket={socket} room={room} />}
        {room.state === 'PLAYING' && <GameScreen socket={socket} room={room} privateData={privateData} />}
        {room.state === 'VOTING' && <VotingScreen socket={socket} room={room} />}
        {room.state === 'DISCUSSION' && <DiscussionScreen socket={socket} room={room} />}
        {room.state === 'VOTE_REVEAL' && <VoteRevealScreen socket={socket} room={room} />}
        {room.state === 'LAST_CHANCE' && <LastChanceScreen socket={socket} room={room} />}
        {room.state === 'LEADERBOARD' && <LeaderboardScreen socket={socket} room={room} />}
     </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
       <GameContainer />
    </SocketProvider>
  );
}
