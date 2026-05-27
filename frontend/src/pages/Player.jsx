import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('https://matching-card-game-g59i.onrender.com');// const socket = io('[http://192.168.1.140:3001](http://192.168.1.140:3001)');



export default function Player() {
  const [gameState, setGameState] = useState(null);
  const [name, setName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    socket.on('update_state', (state) => setGameState(state));
    return () => socket.off('update_state');
  }, []);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (err) {
      alert('กรุณาอนุญาตให้ระบบเข้าถึงกล้องถ่ายรูปของคุณ');
    }
  };

  const takePicture = () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      alert('กรุณาเปิดกล้องก่อนถ่ายรูปครับ');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 300; 
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // จัดตำแหน่งรูปให้สัดส่วนเป็นสี่เหลี่ยมจัตุรัสสวยงาม
    ctx.drawImage(videoRef.current, 0, 0, 300, 300);
    setProfilePic(canvas.toDataURL('image/png'));
    
    // ปิดการทำงานของกล้องเมื่อถ่ายเสร็จแล้ว
    const stream = videoRef.current.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const joinGame = () => {
    if (!name.trim()) {
      alert('กรุณากรอกชื่อของคุณก่อนเข้าร่วมเกมครับ');
      return;
    }
    if (!profilePic) {
      alert('กรุณาถ่ายรูปโปรไฟล์ของคุณก่อนครับ');
      return;
    }
    socket.emit('join_game', { name, profilePic });
    setHasJoined(true);
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-50">
        <div className="text-2xl font-bold text-cream-800 animate-pulse">กำลังเชื่อมต่อระบบเกม...</div>
      </div>
    );
  }

  // =========================================================
  // 1. หน้า LOBBY (สมัครชื่อ ถ่ายรูป เพื่อเตรียมความพร้อม)
  // =========================================================
  if (gameState.status === 'lobby' || !hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-cream-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-cream-200">
          <h1 className="text-3xl font-black text-center mb-6 text-cream-800 tracking-wide">ลงทะเบียนผู้เล่น</h1>
          
          <label className="block text-sm font-bold text-cream-800 mb-2">ชื่อผู้เล่น :</label>
          <input 
            type="text" 
            placeholder="กรอกชื่อของคุณที่นี่..."
            disabled={hasJoined}
            className="w-full p-3 mb-6 rounded-xl bg-cream-50 border border-cream-200 focus:outline-none focus:ring-2 focus:ring-cream-800 font-medium"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
          
          <label className="block text-sm font-bold text-cream-800 mb-2">รูปถ่ายโปรไฟล์ :</label>
          {!profilePic ? (
            <div className="flex flex-col items-center gap-4">
              <video ref={videoRef} autoPlay playsInline className="w-full h-56 bg-gray-900 rounded-xl object-cover shadow-inner"></video>
              <div className="flex gap-3 w-full">
                <button onClick={openCamera} className="flex-1 py-2.png bg-cream-200 text-cream-800 font-bold rounded-xl shadow hover:bg-cream-100 transition duration-200">
                  เปิดกล้อง
                </button>
                <button onClick={takePicture} className="flex-1 py-2.png bg-cream-800 text-white font-bold rounded-xl shadow hover:bg-opacity-90 transition duration-200">
                  ถ่ายรูปภาพ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <img src={profilePic} alt="Profile Preview" className="w-36 h-36 rounded-full border-4 border-cream-200 object-cover shadow-md" />
              {!hasJoined ? (
                <div className="flex flex-col gap-2 w-full">
                  <button onClick={joinGame} className="w-full py-4 bg-green-600 text-white rounded-xl font-black shadow-lg hover:bg-green-700 transition duration-200 text-xl tracking-wide">
                    เข้าร่วมห้องรอเล่น 🚀
                  </button>
                  <button onClick={() => setProfilePic(null)} className="w-full py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition duration-200 text-sm">
                    ถ่ายใหม่
                  </button>
                </div>
              ) : (
                <div className="w-full text-center p-4 bg-green-50 text-green-700 font-black rounded-xl border-2 border-green-200 animate-pulse">
                  ✓ เข้าห้องสำเร็จแล้ว! รอแอดมินเริ่มเกม...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // หน้า INTRO (รอเริ่มเกม)
  // =========================================================
  if (gameState.status === 'intro') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-800 text-white p-6 text-center">
        <div className="animate-pulse">
          <h2 className="text-3xl font-black mb-4">เตรียมตัวให้พร้อม!</h2>
          <p className="text-xl">มองไปที่หน้าจอหอประชุมได้เลย...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // 2. หน้า ENDED (เมื่อจบการแข่งขันและประกาศผลลัพธ์)
  // =========================================================
  if (gameState.status === 'ended') {
    const myInfo = gameState.players.find(p => p.id === socket.id);
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center bg-cream-50 text-center animate-fade-in">
        <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-cream-200 max-w-lg w-full">
          <h1 className="text-5xl font-black mb-4 text-cream-800 tracking-tight">🏁 จบการแข่งขัน!</h1>
          <p className="text-xl font-bold text-gray-500 mb-8">การ์ดทั้งหมดถูกจับคู่ครบเรียบร้อยแล้ว</p>
          
          <div className="p-6 bg-yellow-50 rounded-2xl border-4 border-yellow-400 mb-6 flex flex-col items-center justify-center shadow-inner">
            <span className="text-lg font-bold text-yellow-800 mb-1">ผลคะแนนของคุณ</span>
            <span className="text-5xl font-black text-yellow-600">{myInfo ? myInfo.score : 0} <span className="text-2xl font-bold text-yellow-800">คู่</span></span>
          </div>
          
          <p className="text-2xl font-black text-cream-800 animate-bounce mt-4">
            🏆 หันไปดูอันดับแท่นรางวัลที่จอหอประชุมได้เลย! 🎉
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // 3. หน้า PLAYING (ส่วนบอร์ดกระดานสำหรับการกดเล่นจับคู่การ์ด)
  // =========================================================
  const myPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
  const isMyTurn = gameState.currentTurnIndex === myPlayerIndex;
  const currentTurnPlayerName = gameState.players[gameState.currentTurnIndex]?.name || 'คนอื่น';

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-cream-50">
      
      {/* ส่วนหัวแสดงผลแจ้งเตือนและ Highlight ล็อกสิทธิ์ของตาผู้เล่น */}
      <div className="w-full max-w-5xl flex flex-col items-center mb-6">
        {isMyTurn ? (
          <div className="bg-yellow-400 text-yellow-950 px-8 py-4 rounded-full font-black text-2xl md:text-3xl shadow-xl animate-pulse border-4 border-yellow-500 text-center tracking-wide">
            🔥 ตาของคุณแล้ว! เลือกเปิดการ์ดได้เลย 🔥
          </div>
        ) : (
          <div className="bg-white text-cream-800 px-6 py-3 rounded-full font-black text-lg md:text-xl shadow-md border-2 border-cream-200 text-center">
            🔒 รอก่อนนะ... ตอนนี้เป็นตาของ: <span className="text-red-600 font-black">{currentTurnPlayerName}</span>
          </div>
        )}
      </div>

      {/* แผงแสดงรายชื่อสถานะและคะแนนแบบย่อของผู้เล่นทุกคนในห้อง */}
      <div className="flex flex-wrap gap-3 mb-8 w-full justify-center">
        {gameState.players.map((p, idx) => {
          const isThisPlayerTurn = gameState.currentTurnIndex === idx;
          return (
            <div 
              key={idx} 
              className={`flex items-center gap-3 p-2.png px-4 rounded-xl shadow-sm border-2 transition-all duration-300
                ${isThisPlayerTurn ? 'bg-yellow-100 border-yellow-500 scale-105 shadow-md' : 'bg-white border-cream-200 opacity-80'}`}
            >
              <img src={p.profilePic} alt={p.name} className="w-10 h-10 rounded-full border border-cream-200 object-cover" />
              <div className="flex flex-col">
                <span className="text-sm font-black text-cream-800 truncate max-w-[100px]">
                  {p.name} {p.id === socket.id && '(คุณ)'}
                </span>
                <span className="text-xs font-bold text-cream-800/70">คะแนน: {p.score}</span>
              </div>
              {isThisPlayerTurn && <span className="text-xs">⚡</span>}
            </div>
          );
        })}
      </div>

      {/* บอร์ดเกมส่วนบุคคล: จัดให้แสดงผลได้สมดุลสูงสุด */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-4 w-full max-w-5xl">
        {gameState.cards.map((card, idx) => {
          const isFlipped = gameState.flippedCards.includes(idx) || gameState.matchedPairs.includes(card.pairId);
          const isMatched = gameState.matchedPairs.includes(card.pairId);
          
          return (
            <div 
              key={idx} 
              onClick={() => {
                // เงื่อนไขในการกดการ์ด: ต้องเป็นเทิร์นตัวเอง, การ์ดยังไม่ได้เปิด, และยังจับคู่ไม่สำเร็จ
                if (isMyTurn && !isFlipped && !isMatched && gameState.flippedCards.length < 2) {
                  socket.emit('flip_card', idx);
                }
              }}
              className={`aspect-[25/35] w-full rounded-xl shadow-md transition-all duration-300 transform flex items-center justify-center border-2 text-center select-none
                ${isFlipped ? 'bg-white border-cream-200 rotate-0 scale-100 shadow-inner' : 'bg-cream-800 border-cream-800'}
                ${isMatched ? 'opacity-40 border-green-500' : ''}
                ${isMyTurn && !isFlipped && !isMatched ? 'cursor-pointer hover:border-yellow-400 hover:scale-105 active:scale-95' : 'cursor-not-allowed'}
              `}
            >
              {isFlipped ? (
                <img 
                  src={`/${card.image}`} 
                  alt="card item" 
                  className="w-full h-full object-contain p-1.png rounded-lg" 
                  onError={(e) => { e.target.style.display = 'none'; }} // หากรูปยังไม่มีใน public ให้ซ่อนไว้เพื่อป้องกัน UI พัง
                />
              ) : (
                // แสดงลายหลังการ์ดเป็นสัญลักษณ์เกม
                <span className="text-white/20 font-black text-2xl">?</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}