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

// สร้างการ์ด 14 คู่ (28 ใบ)
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
  status: 'lobby', // lobby, intro, playing, ended
  players: [], 
  cards: generateCards(),
  flippedCards: [],
  matchedPairs: [],
  currentTurnIndex: 0
};

io.on('connection', (socket) => {
  socket.emit('update_state', gameState);

  socket.on('join_game', (playerData) => {
    if(gameState.players.length < 4 && !gameState.players.find(p => p.id === socket.id)) {
      gameState.players.push({ id: socket.id, ...playerData, score: 0 });
      io.emit('update_state', gameState);
    }
  });

  // --- แอดมินเริ่มเกม (โชว์เครดิตก่อน 3 วินาที) ---
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

  // --- ฟีเจอร์ลับสำหรับ Admin (Test Program) ---
  socket.on('admin_adjust_score', ({ playerId, amount }) => {
    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
      player.score += amount;
      io.emit('update_state', gameState);
    }
  });

  socket.on('admin_force_end', () => {
    // หงายทุกใบและจบเกมทันที
    const allPairIds = [...new Set(gameState.cards.map(c => c.pairId))];
    gameState.matchedPairs = allPairIds;
    gameState.status = 'ended';
    io.emit('update_state', gameState);
    io.emit('play_sfx', 'win');
  });
  // ------------------------------------------

  socket.on('flip_card', (cardIndex) => {
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== socket.id) return;

    if (gameState.flippedCards.length < 2 && !gameState.flippedCards.includes(cardIndex) && !gameState.matchedPairs.includes(gameState.cards[cardIndex].pairId)) {
      
      gameState.flippedCards.push(cardIndex);
      io.emit('play_sfx', 'flip'); // เล่นเสียงตอนหงายไพ่
      
      if (gameState.flippedCards.length === 2) {
        const [idx1, idx2] = gameState.flippedCards;
        const card1 = gameState.cards[idx1];
        const card2 = gameState.cards[idx2];
        const isMatch = (card1.pairId === card2.pairId);

        if (isMatch) {
          gameState.matchedPairs.push(card1.pairId);
          // ระบบคะแนนใหม่: ป้องกัน(good) = 2, เสี่ยง(bad) = 1
          const earnedPoints = card1.type === 'good' ? 2 : 1;
          currentPlayer.score += earnedPoints;
          io.emit('play_sfx', 'correct'); 
        } else {
          io.emit('play_sfx', 'wrong'); 
          gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
        }

        // เช็คจบเกมเมื่อเปิดไพ่ครบ 14 คู่ [cite: 37]
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