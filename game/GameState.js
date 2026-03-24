const WORD_LISTS = {
  animals: ["Elephant", "Lion", "Tiger", "Penguin", "Dolphin", "Cheetah", "Kangaroo", "Giraffe"],
  food: ["Apple", "Banana", "Pizza", "Burger", "Sushi", "Taco", "Spaghetti", "Cheese"],
  technology: ["Computer", "Smartphone", "Robot", "Internet", "Software", "Hardware", "Network", "Database"],
  movies: ["Spiderman", "Batman", "Inception", "Titanic", "Avatar", "Godzilla", "Jurassic", "Matrix"],
  random: ["Ocean", "Mountain", "Guitar", "Spaceship", "Library", "Pyramid", "Diamond", "Tornado"]
};

// Simple Levenshtein distance for word similarity
function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

const rooms = new Map();

class GameState {
  static createRoom(hostUserId) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const room = {
      code,
      hostId: hostUserId, // now tracks userId
      players: new Map(), // map of userId -> player obj
      state: 'LOBBY',
      settings: {
        maxPlayers: 10,
        impostorCount: 1,
        hintsEnabled: true,
        category: 'random',
        similarWordMode: false,
        clueRounds: 1,
        turnTimeLength: 30
      },
      gameData: {
        discussionEndTime: null,
        voteResults: null,
        lastChanceUserId: null,
        secretWord: '',
        hint: '',
        similarWord: '',
        impostors: [], // array of userIds
        turnOrder: [], // array of userIds
        currentTurnIndex: 0,
        currentRound: 1,
        turnEndTime: null,
        submissions: [],
        votes: new Map(), // voterUserId -> targetUserId
        winner: null,
        wordHistory: []
      }
    };
    rooms.set(code, room);
    return room;
  }

  static getRoom(code) {
    return rooms.get(code);
  }

  static joinRoom(code, playerInfo) {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found' };
    
    const { userId, socketId, name, avatar } = playerInfo;
    
    // Check if player is reconnecting
    if (room.players.has(userId)) {
      const p = room.players.get(userId);
      p.socketId = socketId;
      p.name = name; // Update name/avatar in case they changed it
      if (avatar) p.avatar = avatar;
      p.isOnline = true;
      return { success: true, room, reconnected: true };
    }

    if (room.players.size >= room.settings.maxPlayers) {
      return { error: 'Room is full' };
    }
    
    // If joining mid-game, they are a spectator
    const isSpectator = room.state !== 'LOBBY' && room.state !== 'LEADERBOARD';

    room.players.set(userId, {
      userId,
      socketId,
      name,
      avatar: avatar || '👤',
      score: 0,
      impostorWins: 0,
      normalWins: 0,
      role: null,
      isSpectator,
      isOnline: true
    });

    return { success: true, room, reconnected: false };
  }

  static handleDisconnect(code, socketId) {
    const room = this.getRoom(code);
    if (!room) return;

    // Find user by socketId
    let disconnectedUserId = null;
    for (const [uid, player] of room.players.entries()) {
       if (player.socketId === socketId) {
          disconnectedUserId = uid;
          break;
       }
    }

    if (disconnectedUserId) {
       const p = room.players.get(disconnectedUserId);
       p.isOnline = false;

       // If in lobby or leaderboard, maybe just remove them if we wanted, 
       // but for reconnection sake we'll keep them as offline unless everyone leaves
       let onlineCount = 0;
       for (const pl of room.players.values()) {
          if (pl.isOnline) onlineCount++;
       }

       if (onlineCount === 0) {
          rooms.delete(code); // Clean up empty rooms
       } else if (room.hostId === disconnectedUserId) {
          // Reassign host
          const nextOnlineUser = Array.from(room.players.values()).find(pl => pl.isOnline);
          if (nextOnlineUser) room.hostId = nextOnlineUser.userId;
       }
    }
  }

  static updateSettings(code, settings) {
    const room = this.getRoom(code);
    if (!room) return;
    room.settings = { ...room.settings, ...settings };
  }

  static startRound(code) {
    const room = this.getRoom(code);
    if (!room) return;

    const activePlayers = Array.from(room.players.values()).filter(p => !p.isSpectator && p.isOnline);
    if (activePlayers.length < 3) {
      return { error: 'Need at least 3 active players' };
    }

    // Reset roles and make all online players active
    room.players.forEach(p => {
      if (p.isOnline) {
         p.isSpectator = false;
         p.role = 'NORMAL';
      } else {
         p.isSpectator = true;
      }
    });

    const categoryWords = WORD_LISTS[room.settings.category] || WORD_LISTS.random;
    const wordIndex = Math.floor(Math.random() * categoryWords.length);
    const secretWord = categoryWords[wordIndex];
    const hint = `Starts with ${secretWord.charAt(0)}`; 
    
    // Select a similar word from a different word temporarily (or reversed)
    let similarWord = secretWord;
    while(similarWord === secretWord) {
       similarWord = categoryWords[Math.floor(Math.random() * categoryWords.length)];
    }

    const numImpostors = Math.min(room.settings.impostorCount, activePlayers.length - 1);
    const shuffledPlayers = [...activePlayers].sort(() => 0.5 - Math.random());
    const impostors = shuffledPlayers.slice(0, numImpostors).map(p => p.userId);

    impostors.forEach(id => {
      room.players.get(id).role = 'IMPOSTOR';
    });

    const turnOrder = [...activePlayers].sort(() => 0.5 - Math.random()).map(p => p.userId);

    room.state = 'PLAYING';
    room.gameData = {
      discussionEndTime: null,
      voteResults: null,
      lastChanceUserId: null,
      secretWord,
      hint: room.settings.hintsEnabled ? hint : 'No hint enabled',
      similarWord: room.settings.similarWordMode ? similarWord : null,
      impostors,
      turnOrder,
      currentTurnIndex: 0,
      currentRound: 1,
      turnEndTime: Date.now() + (room.settings.turnTimeLength * 1000),
      submissions: [],
      votes: new Map(),
      winner: null,
      wordHistory: []
    };

    return { success: true };
  }

  static getActivePlayers(room) {
    return Array.from(room.players.values()).filter(p => !p.isSpectator);
  }

  static getRoomPublicData(code) {
     const room = this.getRoom(code);
     if (!room) return null;
     
     const playersPublic = Array.from(room.players.values()).map(({ userId, name, avatar, score, impostorWins, normalWins, isSpectator, isOnline }) => ({
       userId, name, avatar, score, impostorWins, normalWins, isSpectator, isOnline
     }));

     return {
       code: room.code,
       hostId: room.hostId,
       state: room.state,
       settings: room.settings,
       players: playersPublic,
       gameData: {
         turnOrder: room.gameData.turnOrder,
         currentTurnIndex: room.gameData.currentTurnIndex,
         currentRound: room.gameData.currentRound,
         turnEndTime: room.gameData.turnEndTime,
         submissions: room.gameData.submissions,
         wordHistory: room.gameData.wordHistory,
         winner: room.gameData.winner,
         votesCount: room.gameData.votes.size,
         discussionEndTime: room.gameData.discussionEndTime,
         voteResults: room.gameData.voteResults,
         lastChanceUserId: room.gameData.lastChanceUserId
       }
     };
  }

  static getPlayerPrivateData(code, userId) {
     const room = this.getRoom(code);
     if (!room) return null;
     const player = room.players.get(userId);
     if (!player) return null;

     let secretData = { role: player.role };
     
     if (player.role === 'IMPOSTOR') {
       secretData.hint = room.settings.similarWordMode ? room.gameData.similarWord : room.gameData.hint;
     } else if (player.role === 'NORMAL') {
       secretData.secretWord = room.gameData.secretWord;
     }

     return secretData;
  }

  static validateWord(word, secretWord, wordHistory) {
     const cleanWord = word.trim().toLowerCase();
     const cleanSecret = secretWord.toLowerCase();
     
     if (cleanWord === cleanSecret) return { valid: false, instantWinAttempt: true };
     
     if (wordHistory.some(w => w.word.toLowerCase() === cleanWord)) {
        return { valid: false, error: 'Word already submitted this game' };
     }

     const distance = getEditDistance(cleanWord, cleanSecret);
     if (distance <= 2 && cleanSecret.length > 4) {
        return { valid: false, error: 'Word is too similar to the secret word' };
     }

     return { valid: true };
  }

  static processTurnAdvance(room) {
     room.gameData.currentTurnIndex++;
     if (room.gameData.currentTurnIndex >= room.gameData.turnOrder.length) {
        if (room.gameData.currentRound < room.settings.clueRounds) {
           room.gameData.currentRound++;
           room.gameData.currentTurnIndex = 0;
           room.gameData.turnEndTime = Date.now() + (room.settings.turnTimeLength * 1000);
           room.gameData.submissions = []; // Clear current submissions for UI if we want fresh round? Or keep growing. We will keep growing history.
        } else {
           room.state = 'DISCUSSION';
           room.gameData.discussionEndTime = Date.now() + 30000;
           room.gameData.turnEndTime = null;
        }
     } else {
        room.gameData.turnEndTime = Date.now() + (room.settings.turnTimeLength * 1000);
     }
  }

  static submitWord(code, userId, word) {
    const room = this.getRoom(code);
    if(!room || room.state !== 'PLAYING') return { error: 'Invalid state' };

    const expectedUserId = room.gameData.turnOrder[room.gameData.currentTurnIndex];
    if (userId !== expectedUserId) return { error: 'Not your turn' };

    const isImpostor = room.gameData.impostors.includes(userId);
    const validation = this.validateWord(word, room.gameData.secretWord, room.gameData.wordHistory);

    if (validation.instantWinAttempt) {
       if (isImpostor) {
          return this.endRound(code, 'IMPOSTORS');
       } else {
          return { error: 'You cannot submit the secret word itself' };
       }
    }

    if (!validation.valid) {
       return { error: validation.error };
    }

    room.gameData.submissions.push({
       userId,
       word: word.trim()
    });

    room.gameData.wordHistory.push({
       userId,
       word: word.trim()
    });

    this.processTurnAdvance(room);
    return { success: true };
  }

  static forceSkipTurn(code) {
     const room = this.getRoom(code);
     if(!room || room.state !== 'PLAYING') return;
     
     const currentUserId = room.gameData.turnOrder[room.gameData.currentTurnIndex];
     
     room.gameData.submissions.push({
        userId: currentUserId,
        word: '*[Time Exceeded]*'
     });

     room.gameData.wordHistory.push({
        userId: currentUserId,
        word: '*[Time Exceeded]*'
     });

     this.processTurnAdvance(room);
     return { success: true };
  }

  static submitVote(code, voterUserId, targetUserId) {
     const room = this.getRoom(code);
     if (!room || room.state !== 'VOTING') return { error: 'Not in voting state' };

     const voter = room.players.get(voterUserId);
     if (!voter || voter.isSpectator) return { error: 'Cannot vote' };

     room.gameData.votes.set(voterUserId, targetUserId);

     const numActivePlayers = Array.from(room.players.values()).filter(p => !p.isSpectator).length;

     if (room.gameData.votes.size >= numActivePlayers) {
        this.calculateVotes(code);
     }

     return { success: true };
  }

  static calculateVotes(code) {
     const room = this.getRoom(code);
     const voteCounts = {};
     let maxVotes = 0;
     let eliminatedId = null;
     
     for (const targetId of room.gameData.votes.values()) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
     }
     
     for (const [targetId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
           maxVotes = count;
           eliminatedId = targetId;
        }
     }
     
     const tiedPlayers = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
     if (tiedPlayers.length > 1) {
       eliminatedId = tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)];
     }

     const isEliminatedImpostor = room.gameData.impostors.includes(eliminatedId);
     const voteEntries = Array.from(room.gameData.votes.entries()).map(([voterId, targetId]) => ({ voterId, targetId }));

     room.state = 'VOTE_REVEAL';
     room.gameData.voteResults = {
        voteCounts,
        voteEntries,
        eliminatedId,
        isEliminatedImpostor
     };
  }

  static proceedVoteReveal(code) {
     const room = this.getRoom(code);
     if (!room || room.state !== 'VOTE_REVEAL') return { error: 'Invalid state' };

     const { eliminatedId, isEliminatedImpostor, voteEntries } = room.gameData.voteResults;
     
     if (eliminatedId) {
        const p = room.players.get(eliminatedId);
        if (p) p.isSpectator = true;
     }

     // Award points for correct voting
     voteEntries.forEach(({ voterId, targetId }) => {
        if (room.gameData.impostors.includes(targetId)) {
           const voter = room.players.get(voterId);
           if (voter && voter.role === 'NORMAL') voter.score += 1; // +1 correct vote!
        }
     });

     const impostorsLeft = room.gameData.impostors.filter(id => id !== eliminatedId);
     room.gameData.impostors = impostorsLeft;
     
     const activePlayers = this.getActivePlayers(room);

     if (isEliminatedImpostor && impostorsLeft.length === 0) {
        room.state = 'LAST_CHANCE';
        room.gameData.lastChanceUserId = eliminatedId;
        return { success: true };
     }

     // Surviving impostors get +1 point for a round survive
     impostorsLeft.forEach(uid => {
        const p = room.players.get(uid);
        if (p) p.score += 1;
     });

     if (impostorsLeft.length >= activePlayers.length - impostorsLeft.length) {
        return this.endRound(code, 'IMPOSTORS');
     }

     room.gameData.turnOrder = activePlayers.map(p => p.userId);
     room.gameData.currentTurnIndex = 0;
     room.gameData.currentRound = 1;
     room.gameData.submissions = [];
     room.gameData.wordHistory = [];
     room.gameData.votes.clear();
     room.gameData.voteResults = null;
     room.gameData.turnEndTime = Date.now() + (room.settings.turnTimeLength * 1000);
     room.state = 'PLAYING';

     return { success: true };
  }

  static submitLastChance(code, userId, word) {
     const room = this.getRoom(code);
     if (!room || room.state !== 'LAST_CHANCE') return { error: 'Invalid state' };
     if (userId !== room.gameData.lastChanceUserId) return { error: 'Not your turn to guess' };

     const cleanWord = word.trim().toLowerCase();
     const cleanSecretWord = room.gameData.secretWord.toLowerCase();

     if (cleanWord === cleanSecretWord) {
        return this.endRound(code, 'IMPOSTORS');
     } else {
        return this.endRound(code, 'NORMALS');
     }
  }

  static endDiscussion(code) {
     const room = this.getRoom(code);
     if (!room || room.state !== 'DISCUSSION') return { error: 'Invalid state' };
     room.state = 'VOTING';
     return { success: true };
  }

  static endRound(code, winner) {
     const room = this.getRoom(code);
     room.state = 'LEADERBOARD';
     room.gameData.winner = winner;

     const activePlayers = this.getActivePlayers(room);
     activePlayers.forEach(p => {
        if (winner === 'IMPOSTORS' && p.role === 'IMPOSTOR') {
           p.score += 3;
           p.impostorWins += 1;
        } else if (winner === 'NORMALS' && p.role === 'NORMAL') {
           p.score += 1;
           p.normalWins += 1;
        }
     });

     return { success: true, ended: true, winner };
  }
}

module.exports = GameState;
