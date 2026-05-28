const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// แสดงสถานะหน้าแรกของ Server แทนหน้าว่างเปล่า
app.get('/', (req, res) => {
  res.send('<h1>🃏 Matching Card Game Server is Online!</h1>');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // แนะนำให้เปลี่ยนเป็น URL Vercel ของคุณตอนโปรดักชัน เช่น https://your-game.vercel.app
    methods: ["GET", "POST"]
  }
});

// สถานะเริ่มต้นของเกม
let players = [];
let gameState = {
  status: 'waiting', // waiting, playing, ended
  cards: [],
  flippedCards: [], // เก็บการ์ดที่กำลังถูกเปิดในเทิร์นนั้น [card1, card2]
  currentTurnPlayerId: null
};

// ฟังก์ชันสำหรับสร้างและสุ่มสำรับการ์ด (8 คู่การ์ดเสี่ยง + 6 คู่การ์ดป้องกัน)
function generateDeck() {
  let deck = [];
  let id = 1;

  // 1. การ์ดความเสี่ยง (bad_card) 8 คู่ = 16 ใบ
  for (let i = 1; i <= 8; i++) {
    deck.push({ id: id++, pairId: `bad_${i}`, image: `bad_card${i}_1.webp`, type: 'bad', isFlipped: false, isMatched: false });
    deck.push({ id: id++, pairId: `bad_${i}`, image: `bad_card${i}_2.webp`, type: 'bad', isFlipped: false, isMatched: false });
  }

  // 2. การ์ดป้องกัน (good_card) 6 คู่ = 12 ใบ
  for (let i = 1; i <= 6; i++) {
    deck.push({ id: id++, pairId: `good_${i}`, image: `good_card${i}_1.webp`, type: 'good', isFlipped: false, isMatched: false });
    deck.push({ id: id++, pairId: `good_${i}`, image: `good_card${i}_2.webp`, type: 'good', isFlipped: false, isMatched: false });
  }

  // สุ่มตำแหน่งการ์ด (Shuffle)
  return deck.sort(() => Math.random() - 0.5);
}

// สลับเทิร์นไปยังผู้เล่นคนถัดไป
function nextTurn() {
  if (players.length === 0) return;
  const currentIndex = players.findIndex(p => p.id === gameState.currentTurnPlayerId);
  const nextIndex = (currentIndex + 1) % players.length;
  gameState.currentTurnPlayerId = players[nextIndex].id;
}

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  // ส่งข้อมูลปัจจุบันให้เครื่องที่เชื่อมต่อเข้ามาทันที เผื่อหลุด/รีเฟรช
  socket.emit('updatePlayers', players);
  socket.emit('gameUpdate', gameState);

  // บั๊กแก้ไขข้อที่ 1: เข้าร่วมเกมและเช็กประวัติ ID เดิมจาก localStorage
  socket.on('joinGame', ({ id, name }) => {
    const existingPlayerIndex = players.findIndex(p => p.id === id);

    if (existingPlayerIndex !== -1) {
      // ผู้เล่นเก่ารีเฟรชหน้าเว็บ -> อัปเดต Socket ID ใหม่เข้าไปแทนที่ตัวเดิม
      players[existingPlayerIndex].socketId = socket.id;
      console.log(`🔄 Player Reconnected: ${name} (ID: ${id})`);
    } else {
      // ผู้เล่นใหม่จริงๆ -> เพิ่มชื่อเข้าไปใหม่
      players.push({
        id: id,
        name: name,
        socketId: socket.id,
        score: 0
      });
      console.log(`➕ New Player Joined: ${name}`);
    }
    io.emit('updatePlayers', players);
  });

  // แอดมินสั่งเริ่มเกม
  socket.on('startGame', () => {
    if (players.length === 0) return;
    
    // รีเซ็ตแต้มผู้เล่นทุกคนเป็น 0 ใหม่เมื่อเริ่มเกม
    players.forEach(p => p.score = 0);
    
    gameState.status = 'playing';
    gameState.cards = generateDeck();
    gameState.flippedCards = [];
    gameState.currentTurnPlayerId = players[0].id; // ให้คนแรกเล่นก่อน

    io.emit('updatePlayers', players);
    io.emit('gameUpdate', gameState);
  });

  // ผู้เล่นคลิกเปิดการ์ด
  socket.on('flipCard', ({ cardId, playerId }) => {
    // ป้องกันการกดหากไม่ใช่เทิร์นตัวเอง หรือเกมไม่ได้ดำเนินอยู่
    if (gameState.status !== 'playing' || gameState.currentTurnPlayerId !== playerId) return;
    if (gameState.flippedCards.length >= 2) return;

    const card = gameState.cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    // เปิดการ์ดใบที่เลือก
    card.isFlipped = true;
    gameState.flippedCards.push(card);
    io.emit('gameUpdate', gameState);

    // ถ้าเปิดครบ 2 ใบแล้ว ให้ทำการเช็กคู่ผลลัพธ์
    if (gameState.flippedCards.length === 2) {
      const [card1, card2] = gameState.flippedCards;

      if (card1.pairId === card2.pairId) {
        // ผลลัพธ์: จับคู่ถูกต้อง!
        card1.isMatched = true;
        card2.isMatched = true;
        
        // เพิ่มคะแนนให้ผู้เล่นปัจจุบัน (+1 แต้ม)
        const player = players.find(p => p.id === playerId);
        if (player) player.score += 1;

        gameState.flippedCards = [];
        io.emit('updatePlayers', players);

        // เช็กว่าการ์ดถูกจับคู่จนหมดกระดานหรือยัง
        const allMatched = gameState.cards.every(c => c.isMatched);
        if (allMatched) {
          gameState.status = 'ended';
        }
        io.emit('gameUpdate', gameState);
      } else {
        // ผลลัพธ์: จับคู่ผิด! -> ปล่อยให้เห็นรูป 1.2 วินาทีแล้วคว่ำกลับอัตโนมัติพร้อมสลับเทิร์น
        setTimeout(() => {
          card1.isFlipped = false;
          card2.isFlipped = false;
          gameState.flippedCards = [];
          nextTurn(); // สลับเทิร์น
          io.emit('gameUpdate', gameState);
        }, 1200);
      }
    }
  });

  // แอดมินบังคับจบเกมกลางคัน (Force End)
  socket.on('forceEndGame', () => {
    gameState.status = 'ended';
    io.emit('gameUpdate', gameState);
  });

  // แอดมินปรับเพิ่ม/ลดคะแนนของผู้เล่นแบบแมนนวล
  socket.on('adminChangeScore', ({ playerId, amount }) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      player.score = Math.max(0, player.score + amount); // คะแนนไม่ให้ติดลบ
      io.emit('updatePlayers', players);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    // หมายเหตุ: จงใจไม่ลบผู้เล่นออกจาก Array ทันที เพื่อป้องกันแต้มและชื่อหายเมื่อเน็ตกระตุกหรือกด Refresh
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});