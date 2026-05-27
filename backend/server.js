const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const generateCards = () => {
  let cards = [];
  for(let i=1; i<=8; i++) {
    cards.push({ id: `bad_${i}_1`, pairId: `bad_${i}`, image: `bad_card${i}_1.png`, type: 'bad' });
    cards.push({ id: `bad_${i}_2`, pairId: `bad_${i}`, image: `bad_card${i}_2.png`, type: 'bad' });
  }
  for(let i=1; i<=6; i++) {
    cards.push({ id: `good_${i}_1`, pairId: `good_${i}`, image: `good_card${i}_1.png`, type: 'good' });
    cards.push({ id: `good_${i}_2`, pairId: `good_${i}`, image: `good_card${i}_2.png`, type: 'good' });
  }
  return cards.sort(() => Math.random() - 0.5);
};

let gameState = {
  status: 'lobby',
  players: [], 
  cards: generateCards(),
  flippedCards: [],
  matchedPairs: [],
  currentTurnIndex: 0
};

io.on('connection', (socket) => {
  socket.emit('update_state', gameState);

  // --- 📌 ส่วนที่แก้ไข: ระบบ Reconnect ป้องกันการกด Refresh แล้วข้อมูลหาย ---
  socket.on('join_game', (playerData) => {
    // หาว่ามีผู้เล่นที่มี uniqueId นี้อยู่ในระบบแล้วหรือยัง
    const existingPlayerIndex = gameState.players.findIndex(p => p.uniqueId === playerData.uniqueId);

    if (existingPlayerIndex !== -1) {
      // ถ้ามีอยู่แล้ว (กด Refresh) ให้แค่เปลี่ยนอัปเดต Socket ID กลับมาเป็นของปัจจุบัน
      gameState.players[existingPlayerIndex].id = socket.id;
      io.emit('update_state', gameState);
    } else if (gameState.players.length < 4) {
      // ถ้าเป็นผู้เล่นหน้าใหม่
      gameState.players.push({
        id: socket.id,
        uniqueId: playerData.uniqueId, // เก็บ ID ประจำตัวถาวรไว้ด้วย
        name: playerData.name,
        profilePic: playerData.profilePic,
        score: 0
      });
      io.emit('update_state', gameState);
    }
  });
  // --------------------------------------------------------

  socket.on('admin_start_game', () => {
    gameState.status = 'intro';
    io.emit('update_state', gameState);
    setTimeout(() => {
      gameState.status = 'playing';
      gameState.currentTurnIndex = 0;
      io.emit('update_state', gameState);
    }, 3000);
  });

  socket.on('admin_restart_game', () => {
    gameState.status = 'lobby';
    gameState.players = [];
    gameState.flippedCards = [];
    gameState.matchedPairs = [];
    gameState.cards = generateCards();
    gameState.currentTurnIndex = 0;
    io.emit('update_state', gameState);
  });

  // --- ฟีเจอร์เตะผู้เล่น ---
  socket.on('admin_kick_player', (playerId) => {
    const index = gameState.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      gameState.players.splice(index, 1); // ลบผู้เล่นคนนั้นออกจาก Array
      
      // ป้องกันบั๊กกรณีที่เตะคนที่กำลังเล่นอยู่ แล้ว Turn Index ทะลุจำนวนผู้เล่น
      if (gameState.currentTurnIndex >= gameState.players.length) {
        gameState.currentTurnIndex = 0;
      }
      io.emit('update_state', gameState);
    }
  });

  socket.on('admin_adjust_score', ({ playerId, amount }) => {
    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
      player.score += amount;
      io.emit('update_state', gameState);
    }
  });

  socket.on('admin_force_end', () => {
    const allPairIds = [...new Set(gameState.cards.map(c => c.pairId))];
    gameState.matchedPairs = allPairIds;
    gameState.status = 'ended';
    io.emit('update_state', gameState);
    io.emit('play_sfx', 'win');
  });

  socket.on('flip_card', (cardIndex) => {
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== socket.id) return;

    if (gameState.flippedCards.length < 2 && !gameState.flippedCards.includes(cardIndex) && !gameState.matchedPairs.includes(gameState.cards[cardIndex].pairId)) {
      
      gameState.flippedCards.push(cardIndex);
      io.emit('play_sfx', 'flip');
      
      if (gameState.flippedCards.length === 2) {
        const [idx1, idx2] = gameState.flippedCards;
        const card1 = gameState.cards[idx1];
        const card2 = gameState.cards[idx2];
        const isMatch = (card1.pairId === card2.pairId);

        if (isMatch) {
          gameState.matchedPairs.push(card1.pairId);
          const earnedPoints = card1.type === 'good' ? 2 : 1;
          currentPlayer.score += earnedPoints;
          io.emit('play_sfx', 'correct'); 
        } else {
          io.emit('play_sfx', 'wrong'); 
          gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
        }

        if (gameState.matchedPairs.length === 14) {
          gameState.status = 'ended';
          io.emit('play_sfx', 'win');
        }
        
        setTimeout(() => {
          gameState.flippedCards = [];
          io.emit('update_state', gameState);
        }, 1500);
      }
      io.emit('update_state', gameState);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));