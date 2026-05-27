import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// ⚠️ อย่าลืมเปลี่ยนลิงก์นี้เป็น Backend ของคุณ
const socket = io('https://matching-card-game-production-6288.up.railway.app');

export default function Admin() {
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    socket.on('update_state', (state) => setGameState(state));
    return () => socket.off('update_state');
  }, []);

  if (!gameState) return <div className="p-8 text-xl font-bold">Loading Admin... (รอ Backend ตื่น)</div>;

  return (
    <div className="min-h-screen p-8 flex flex-col items-center bg-cream-50">
      <h1 className="text-4xl font-bold mb-6 text-cream-800">Admin Monitor</h1>
      
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {gameState.status === 'lobby' && (
          <button onClick={() => socket.emit('admin_start_game')} className="px-6 py-3 bg-green-600 text-white rounded-xl shadow font-bold hover:bg-green-700">▶️ Start Game</button>
        )}
        <button onClick={() => socket.emit('admin_restart_game')} className="px-6 py-3 bg-red-600 text-white rounded-xl shadow font-bold hover:bg-red-700">🔄 Restart System</button>
        
        {(gameState.status === 'playing' || gameState.status === 'intro') && (
          <button 
            onClick={() => {
              if(window.confirm('แน่ใจหรือไม่? การกดปุ่มนี้จะหงายการ์ดทุกใบและจบเกมทันที!')) {
                socket.emit('admin_force_end');
              }
            }} 
            className="px-6 py-3 bg-orange-500 text-white rounded-xl shadow font-bold hover:bg-orange-600 border-2 border-orange-700 animate-pulse"
          >
            ⚠️ Force End Game
          </button>
        )}
      </div>

      {/* ควบคุมคะแนน Manual & ระบบเตะผู้เล่น */}
      <div className="bg-white p-6 rounded-2xl shadow border-2 border-cream-200 w-full max-w-5xl mb-8">
        <h2 className="text-xl font-bold mb-4 text-red-600">🛠️ Player Management (จัดการผู้เล่น)</h2>
        <div className="flex flex-wrap gap-4">
          {gameState.players.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200">
              <img src={p.profilePic} className="w-10 h-10 rounded-full object-cover" alt="prof"/>
              <span className="font-bold w-24 truncate">{p.name}</span>
              <span className="font-black text-xl w-8 text-center">{p.score}</span>
              <button onClick={() => socket.emit('admin_adjust_score', { playerId: p.id, amount: -1 })} className="w-8 h-8 bg-red-200 text-red-800 rounded font-bold hover:bg-red-300">-1</button>
              <button onClick={() => socket.emit('admin_adjust_score', { playerId: p.id, amount: 1 })} className="w-8 h-8 bg-green-200 text-green-800 rounded font-bold hover:bg-green-300">+1</button>
              
              {/* ปุ่มเตะผู้เล่น */}
              <button 
                onClick={() => {
                  if(window.confirm(`ต้องการเตะ ${p.name} ออกจากเกมใช่หรือไม่?`)) {
                    socket.emit('admin_kick_player', p.id);
                  }
                }} 
                className="w-12 h-8 ml-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow"
              >
                เตะ
              </button>
            </div>
          ))}
          {gameState.players.length === 0 && <span className="text-gray-400">ยังไม่มีผู้เล่น...</span>}
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4 text-cream-800">เฉลยการ์ด (Monitor)</h2>
      <div className="grid grid-cols-7 gap-2 w-full max-w-5xl">
        {gameState.cards.map((card, idx) => {
          const isMatched = gameState.matchedPairs.includes(card.pairId);
          return (
            <div key={idx} className={`aspect-[25/35] rounded border flex flex-col items-center justify-center p-1
              ${isMatched ? 'bg-green-200 border-green-600 opacity-50' : 'bg-white border-cream-200'}`}>
              <span className="font-bold text-red-600 text-xs mb-1">[{idx}] {card.type==='good'?'+2':'+1'}</span>
              <img src={`/${card.image}`} alt="card" className="w-full h-full object-contain" />
            </div>
          );
        })}
      </div>
    </div>
  );
}