
// ⚠️ สำคัญ: เปลี่ยนลิงก์ด้านล่างนี้ให้เป็น URL Backend บน Render ของคุณเองนะครับ


import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://matching-card-game-wgrx.onrender.com');

export default function Admin() {
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState({ status: 'waiting', cards: [] });

  // บั๊กแก้ไขข้อที่ 2: เพิ่มการคืนค่าปิดการดักฟัง (socket.off) ป้องกันระบบค้างสะสมหน่วงหน่วยความจำ
  useEffect(() => {
    socket.on('updatePlayers', (data) => {
      setPlayers(data);
    });

    socket.on('gameUpdate', (data) => {
      setGameState(data);
    });

    return () => {
      socket.off('updatePlayers');
      socket.off('gameUpdate');
    };
  }, []);

  const handleStartGame = () => {
    socket.emit('startGame');
  };

  const handleForceEnd = () => {
    socket.emit('forceEndGame');
  };

  // แนะนำการเปลี่ยนคะแนนแบบ Functional Update ป้องกันเขียนทับคะแนนเก่า
  const handleScoreChange = (playerId, amount) => {
    socket.emit('adminChangeScore', { playerId, amount });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#5C4D3C] p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white p-6 rounded-2xl border border-[#F5F0E6] shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3E31]">🛠️ แผงควบคุมแอดมิน (Admin Monitor)</h1>
          <p className="text-xs text-stone-400 mt-1">สถานะระบบปัจจุบัน: <span className="font-semibold text-[#8C7A6B]">{gameState.status.toUpperCase()}</span></p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleStartGame} 
            className="px-5 py-2.5 bg-[#8C7A6B] text-white font-medium rounded-xl hover:bg-[#736354] transition-all shadow-sm text-sm"
          >
            🔄 เริ่มเกม / สุ่มการ์ดใหม่
          </button>
          <button 
            onClick={handleForceEnd} 
            disabled={gameState.status !== 'playing'}
            className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-40 transition-all shadow-sm text-sm"
          >
            🛑 บังคับจบเกม (Force End)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {/* คอลัมน์จัดการคะแนนผู้เล่น */}
        <div className="bg-white p-5 rounded-2xl border border-[#F5F0E6] shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-[#4A3E31]">👥 จัดการคะแนนผู้เล่น</h2>
          {players.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">ไม่มีผู้เล่นในห้องขณะนี้</p>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.id} className={`p-3 rounded-xl border flex flex-col gap-2 ${gameState.currentTurnPlayerId === player.id ? 'border-[#8C7A6B] bg-[#FDFBF7]' : 'border-stone-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm truncate max-w-[120px]">{player.name} {gameState.currentTurnPlayerId === player.id && "⭐️"}</span>
                    <span className="text-sm font-bold bg-[#F5F0E6] px-2 py-0.5 rounded text-[#8C7A6B]">{player.score} แต้ม</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => handleScoreChange(player.id, 1)} className="py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded font-medium transition-all">+1 แต้ม</button>
                    <button onClick={() => handleScoreChange(player.id, -1)} className="py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded font-medium transition-all text-red-600">-1 แต้ม</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* คอลัมน์แสดงแผนผังการ์ดเฉลยเบื้องหลัง (Monitor) */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-[#F5F0E6] shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-[#4A3E31]">👁️ แผนผังเฉลยตำแหน่งการ์ด (เรียลไทม์)</h2>
          {gameState.status === 'waiting' ? (
            <p className="text-sm text-stone-400 text-center py-12">กรุณากดปุ่มเพื่อสุ่มสำรับและเริ่มเกม</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {gameState.cards.map((card) => (
                <div 
                  key={card.id} 
                  className={`aspect-[3/4] rounded-lg border text-[9px] flex flex-col items-center justify-center p-0.5 font-sans break-all transition-all text-center
                    ${card.isMatched ? 'bg-green-50 border-green-200 text-green-700 opacity-50' : ''}
                    ${!card.isMatched && card.isFlipped ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold' : ''}
                    ${!card.isMatched && !card.isFlipped ? 'bg-stone-50 border-stone-200 text-stone-500' : ''}
                  `}
                >
                  <span className="font-bold opacity-70 block text-[8px]">#{card.id}</span>
                  <span className="truncate w-full block">{card.image.replace('.webp','')}</span>
                  <div className="text-[8px] mt-0.5 opacity-60">
                    {card.isMatched ? "✅ จับแล้ว" : card.isFlipped ? "👁️ เปิดอยู่" : "💤 คว่ำอยู่"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

