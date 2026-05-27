import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://fine-wings-mate.loca.lt');

export default function Viewer() {
  const [gameState, setGameState] = useState(null);
  const [bgmVolume, setBgmVolume] = useState(0.5); 
  const [sfxVolume, setSfxVolume] = useState(0.8); // เพิ่มตัวแปรสำหรับจัดการระดับเสียง Effect
  
  const bgmRef = useRef(new Audio('/bgm.mp3'));
  const sfxRef = useRef(new Audio());

  useEffect(() => {
    bgmRef.current.loop = true;

    socket.on('update_state', (state) => {
      setGameState(state);
      if (state.status === 'playing') {
        bgmRef.current.play().catch(e => console.log('Audio play prevented', e));
      } else if (state.status === 'ended') {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
      }
    });

    socket.on('play_sfx', (type) => {
      sfxRef.current.src = `/${type}.mp3`;
      sfxRef.current.play().catch(e => console.log('SFX play prevented', e));
    });

    return () => {
      socket.off('update_state');
      socket.off('play_sfx');
      bgmRef.current.pause();
    };
  }, []);

  // อัปเดตระดับเสียง BGM ทันทีที่มีการเลื่อนแถบ
  useEffect(() => {
    bgmRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  // อัปเดตระดับเสียง Effect ทันทีที่มีการเลื่อนแถบ
  useEffect(() => {
    sfxRef.current.volume = sfxVolume;
  }, [sfxVolume]);

  if (!gameState) return <div className="text-center p-10 text-2xl font-bold">Loading Viewer...</div>;

  const getRankedPlayers = () => {
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
    let currentRank = 1;
    let prevScore = sorted[0]?.score;
    return sorted.map((p) => {
      if (p.score < prevScore) {
        currentRank++;
        prevScore = p.score;
      }
      return { ...p, rank: currentRank };
    });
  };

  // 🎬 หน้า Intro
  if (gameState.status === 'intro') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-cream-800 animate-pulse">
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-widest text-center shadow-2xl">
          Develop by<br/><span className="text-yellow-400">Phakin Charatsri (P'Namo)</span>
        </h1>
      </div>
    );
  }

  // 🏆 หน้า Leaderboard (Ended)
  if (gameState.status === 'ended') {
    const rankedPlayers = getRankedPlayers();
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center bg-cream-50">
        <h1 className="text-6xl font-black mb-16 text-cream-800 tracking-wider animate-bounce">🏆 ผู้ชนะ 🏆</h1>
        <div className="flex items-end justify-center gap-6 h-96">
          {rankedPlayers.map((p, idx) => (
            <div key={idx} className="flex flex-col items-center animate-fade-in-up">
              <span className="text-4xl font-black mb-4 text-cream-800">อันดับ {p.rank}</span>
              <img src={p.profilePic} alt={p.name} className="w-40 h-40 rounded-full border-8 border-yellow-400 object-cover z-10 bg-white shadow-xl" />
              <div 
                className="w-48 bg-yellow-400 rounded-t-xl mt-[-40px] flex flex-col items-center justify-end pb-6 border-4 border-yellow-500 shadow-2xl"
                style={{ height: `${300 - (p.rank * 50)}px` }}
              >
                <span className="text-2xl font-bold text-yellow-900 truncate px-2">{p.name}</span>
                <span className="text-xl font-black text-yellow-900/80">{p.score} คะแนน</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 🎮 หน้าเล่นเกม (Playing)
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];

  return (
    <div className="h-screen w-screen p-4 flex flex-col items-center bg-cream-50 overflow-hidden relative">
      
      {/* 📌 มุมซ้ายบน: กติกาคะแนน */}
      {gameState.status === 'playing' && (
        <div className="absolute top-6 left-6 bg-white/90 p-4 rounded-xl shadow-lg border-2 border-cream-200 z-10">
          <p className="font-bold text-cream-800 text-lg">🛡️ ป้องกัน = <span className="text-green-600">2 คะแนน</span></p>
          <p className="font-bold text-cream-800 text-lg mt-1">⚠️ เสี่ยง = <span className="text-red-600">1 คะแนน</span></p>
        </div>
      )}

      {/* 📌 มุมขวาบน: โปรไฟล์คนเล่นปัจจุบัน */}
      {gameState.status === 'playing' && currentTurnPlayer && (
        <div className="absolute top-6 right-6 flex flex-col items-center bg-yellow-100 p-4 rounded-3xl shadow-2xl border-4 border-yellow-500 z-10 animate-pulse">
          <span className="text-xl font-black text-yellow-700 mb-2 tracking-wide">🔥 ตาของคนนี้ 🔥</span>
          <img src={currentTurnPlayer.profilePic} alt="Turn" className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white object-cover shadow-lg" />
          <span className="text-lg font-black text-cream-800 mt-3 bg-white px-5 py-2 rounded-full shadow">{currentTurnPlayer.name}</span>
        </div>
      )}

      {/* 📌 มุมซ้ายล่าง: แผงควบคุมเสียง (BGM และ SFX) */}
      <div className="absolute bottom-6 left-6 bg-white/90 p-4 rounded-2xl shadow-xl flex flex-col gap-4 border-2 border-cream-200 z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl w-8 text-center">🎵</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500">BGM Music</span>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={bgmVolume} 
              onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
              className="cursor-pointer w-28 accent-yellow-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl w-8 text-center">🔊</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500">Sound Effects</span>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={sfxVolume} 
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              className="cursor-pointer w-28 accent-yellow-500"
            />
          </div>
        </div>
      </div>
      
      {/* โซนรายชื่อผู้เล่นด้านบน (ย่อให้เล็กลง) */}
      <div className="flex gap-4 h-[12%] w-full justify-center items-center mt-2">
        {gameState.players.map((p, idx) => {
          const isMyTurn = gameState.status === 'playing' && gameState.currentTurnIndex === idx;
          return (
            <div key={idx} className={`flex items-center gap-3 p-2 px-5 rounded-2xl shadow-md transition-all duration-300 border-4
              ${isMyTurn ? 'bg-yellow-100 border-yellow-500 scale-110 z-10 shadow-xl' : 'bg-white border-cream-200 opacity-90'}`}>
              <img src={p.profilePic} alt={p.name} className="w-12 h-12 rounded-full border-2 border-cream-200 object-cover" />
              <div className="flex flex-col">
                <span className="text-lg font-black text-cream-800 truncate w-24">{p.name}</span>
                <span className="text-sm font-bold text-cream-800/70">คะแนน: {p.score}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* กระดานเกม: กางเต็มจอ เรียงแนวนอน สีและดีไซน์อิงจาก image_758c2a.png */}
      {gameState.status === 'playing' && (
        <div className="flex-1 w-full flex justify-center items-center p-4 pb-8">
          <div className="grid grid-cols-7 grid-rows-4 gap-3 md:gap-4 w-full max-w-[95vw] lg:max-w-screen-xl h-full">
            {gameState.cards.map((card, idx) => {
              const isFlipped = gameState.flippedCards.includes(idx) || gameState.matchedPairs.includes(card.pairId);
              
              // คำนวณรหัสการ์ด (เช่น แถว 1: A1..A7, แถว 2: B1..B7)
              const rowChar = String.fromCharCode(65 + Math.floor(idx / 7)); // รหัสแถว A, B, C, D
              const colNum = (idx % 7) + 1; // รหัสคอลัมน์ 1 ถึง 7
              const cardLabel = `${rowChar}${colNum}`;

              return (
                <div 
                  key={idx} 
                  className={`relative w-full h-full rounded-[24px] transition-all duration-500 transform flex items-center justify-center
                    ${isFlipped ? 'bg-white border-4 border-cream-200 shadow-md rotate-0' : 'bg-gray-400 shadow-sm'}`}
                >
                  {isFlipped ? (
                    <img src={`/${card.image}`} alt="card" className="w-full h-full object-contain p-2 rounded-xl" />
                  ) : (
                    // ตัวหนังสือหมายเลขกำกับแบบจางๆ สำหรับให้คนดูอ่านง่าย
                    <span className="text-white/30 font-black text-5xl md:text-6xl select-none drop-shadow-sm">
                      {cardLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}