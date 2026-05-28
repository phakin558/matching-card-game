



import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://matching-card-game-wgrx.onrender.com');

export default function Viewer() {
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState({ status: 'waiting', cards: [] });

  // บั๊กแก้ไขข้อที่ 2: ป้องกันหน่วยความจำสะสมจากการหน่วงรับสายสัญญาณซ้ำซ้อน
  useEffect(() => {
    socket.on('updatePlayers', (data) => {
      setPlayers(data);
    });

    socket.on('gameUpdate', (data) => {
      setGameState(data);
    });

    // ส่วนการจัดการ Preload รูปภาพไว้ล่วงหน้าเพื่อความลื่นไหลสำหรับคนดู
    const imagesToPreload = [];
    for (let i = 1; i <= 8; i++) {
      imagesToPreload.push(`/images/bad_card${i}_1.webp`, `/images/bad_card${i}_2.webp`);
    }
    for (let i = 1; i <= 6; i++) {
      imagesToPreload.push(`/images/good_card${i}_1.webp`, `/images/good_card${i}_2.webp`);
    }
    imagesToPreload.forEach(src => { const img = new Image(); img.src = src; });

    return () => {
      socket.off('updatePlayers');
      socket.off('gameUpdate');
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#5C4D3C] p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-6xl text-center mb-6">
        <h1 className="text-4xl font-black text-[#4A3E31] tracking-wide">🏆 ตารางการจับคู่การ์ดแข่งขัน</h1>
        <p className="text-sm text-stone-400 mt-2">หน้าจอแสดงผลหลักสำหรับบอร์ดผู้ชม (Viewer Display)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        {/* สรุปอันดับผู้นำคะแนนประจำแมทช์ */}
        <div className="bg-white p-5 rounded-2xl border border-[#F5F0E6] shadow-sm h-fit">
          <h2 className="text-xl font-bold mb-4 text-[#4A3E31] border-b pb-2">📊 ตารางอันดับคะแนน</h2>
          {players.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">กำลังรอผู้เล่นเข้าร่วมสนาม...</p>
          ) : (
            <div className="space-y-3">
              {players.sort((a, b) => b.score - a.score).map((player, idx) => (
                <div 
                  key={player.id} 
                  className={`p-3 rounded-xl border flex justify-between items-center transition-all
                    ${gameState.currentTurnPlayerId === player.id ? 'border-[#8C7A6B] bg-[#FDFBF7] scale-105' : 'border-stone-100'}
                  `}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-stone-400 text-sm">#{idx + 1}</span>
                    <span className="font-semibold text-sm truncate">{player.name}</span>
                    {gameState.currentTurnPlayerId === player.id && <span className="text-xs bg-[#8C7A6B] text-white px-1.5 py-0.5 rounded-md animate-pulse">กำลังเล่น</span>}
                  </div>
                  <span className="font-black text-base text-[#8C7A6B]">{player.score} Pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* กระดานกลางการแข่งขันสำหรับผู้ชมลุ้น */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-[#F5F0E6] shadow-sm">
          {gameState.status === 'waiting' && (
            <div className="text-center py-24 text-stone-400">
              <div className="text-5xl mb-4 animate-spin">⏳</div>
              <p className="text-lg font-medium">รอผู้ดูแลกดจัดการสร้างการ์ดเพื่อเริ่มกิจกรรม...</p>
            </div>
          )}

          {gameState.status === 'playing' && (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {gameState.cards.map((card) => (
                <div 
                  key={card.id} 
                  className={`aspect-[3/4] rounded-xl border transition-all duration-300 flex flex-col items-center justify-center p-1 font-bold text-xs shadow-sm select-none
                    ${card.isFlipped || card.isMatched 
                      ? 'bg-[#FDFBF7] border-stone-200 rotate-0' 
                      : 'bg-[#8C7A6B] border-[#736354] text-white'
                    }
                    ${card.isMatched ? 'opacity-30 border-green-200 bg-green-50' : ''}
                  `}
                >
                  {card.isFlipped || card.isMatched ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <img 
                        src={`/images/${card.image}`} 
                        alt={card.type} 
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className="text-[10px] text-stone-600 mt-1 break-all">{card.image.replace('.webp','')}</span>
                    </div>
                  ) : (
                    <span className="text-2xl opacity-20">🃏</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {gameState.status === 'ended' && (
            <div className="text-center py-20 bg-[#FDFBF7] rounded-xl border border-dashed border-stone-200">
              <div className="text-6xl mb-4">👑</div>
              <h3 className="text-2xl font-bold text-[#4A3E31] mb-2">จบการแข่งขันประจำแมทช์</h3>
              <p className="text-sm text-stone-400">สรุปผู้ชนะสูงสุดแสดงผลเรียบร้อยในฝั่งตารางซ้ายมือ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}