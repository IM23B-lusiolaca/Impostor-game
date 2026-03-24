const GameState = require('./GameState');

module.exports = function(io) {
  // Setup heartbeat for turn timers
  setInterval(() => {
     for (const [code, room] of GameState.rooms || new Map()) {
        // Just mock check if there's a timer?
        // Wait, rooms is not exported directly natively, I can just query active rooms if I export it.
     }
  }, 1000); // We'll add a better loop in server.js or modify this to avoid direct map iteration

  io.on('connection', (socket) => {
    const broadcastRoomUpdate = (code) => {
       const room = GameState.getRoomPublicData(code);
       if (!room) return;
       io.to(code).emit('room_update', room);

       const fullRoom = GameState.getRoom(code);
       fullRoom.players.forEach((player, userId) => {
         const privateData = GameState.getPlayerPrivateData(code, userId);
         if (privateData && player.socketId) {
            io.to(player.socketId).emit('private_data', privateData);
         }
       });
    };

    socket.on('create_room', ({ userId, name, avatar }, callback) => {
       const room = GameState.createRoom(userId);
       GameState.joinRoom(room.code, { userId, socketId: socket.id, name, avatar });
       socket.join(room.code);
       socket.roomCode = room.code;
       socket.userId = userId;
       callback({ success: true, code: room.code });
       broadcastRoomUpdate(room.code);
    });

    socket.on('join_room', ({ code, userId, name, avatar }, callback) => {
       const res = GameState.joinRoom(code, { userId, socketId: socket.id, name, avatar });
       if (res && res.error) {
         return callback({ error: res.error });
       }
       socket.join(code);
       socket.roomCode = code;
       socket.userId = userId;
       callback({ success: true, code });
       broadcastRoomUpdate(code);
    });

    socket.on('update_settings', (settings) => {
       if (!socket.roomCode) return;
       GameState.updateSettings(socket.roomCode, settings);
       broadcastRoomUpdate(socket.roomCode);
    });

    socket.on('start_game', () => {
       if (!socket.roomCode) return;
       const res = GameState.startRound(socket.roomCode);
       if (res && res.error) {
           return socket.emit('error_message', res.error);
       }
       broadcastRoomUpdate(socket.roomCode);
    });

    socket.on('submit_word', (word) => {
       if (!socket.roomCode || !socket.userId) return;
       const res = GameState.submitWord(socket.roomCode, socket.userId, word);
       if (res && res.error) {
           return socket.emit('error_message', res.error);
       }
       broadcastRoomUpdate(socket.roomCode);
    });

    socket.on('submit_vote', (targetUserId) => {
       if (!socket.roomCode || !socket.userId) return;
       const res = GameState.submitVote(socket.roomCode, socket.userId, targetUserId);
       if (res && res.error) {
           return socket.emit('error_message', res.error);
       }
       broadcastRoomUpdate(socket.roomCode);
    });

    socket.on('end_discussion', () => {
       if (!socket.roomCode) return;
       const res = GameState.endDiscussion(socket.roomCode);
       if (res && res.error) {
           return socket.emit('error_message', res.error);
       }
       broadcastRoomUpdate(socket.roomCode);
    });

    socket.on('proceed_vote_reveal', () => {
       if (!socket.roomCode) return;
       const res = GameState.proceedVoteReveal(socket.roomCode);
       if (res && res.error) {
           return socket.emit('error_message', res.error);
       }
       broadcastRoomUpdate(socket.roomCode);
    });

    socket.on('submit_last_chance', (word) => {
       if (!socket.roomCode || !socket.userId) return;
       const res = GameState.submitLastChance(socket.roomCode, socket.userId, word);
       if (res && res.error) {
           return socket.emit('error_message', res.error);
       }
       broadcastRoomUpdate(socket.roomCode);
    });

    socket.on('force_skip_turn', () => {
       if (!socket.roomCode) return;
       GameState.forceSkipTurn(socket.roomCode);
       broadcastRoomUpdate(socket.roomCode);
    });
    
    socket.on('disconnect', () => {
       if (socket.roomCode) {
          GameState.handleDisconnect(socket.roomCode, socket.id);
          broadcastRoomUpdate(socket.roomCode);
       }
    });
  });
};
