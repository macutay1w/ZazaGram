
import React, { useState, useEffect } from 'react';
import { LANGUAGES } from './constants';
import { Room, User, Message, AppLanguage } from './types';
import ChatRoom from './components/ChatRoom';

const App: React.FC = () => {
  const [langCode, setLangCode] = useState<AppLanguage>('tr');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [view, setView] = useState<'landing' | 'create' | 'join' | 'chat'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [roomName, setRoomName] = useState('');
  const [roomPass, setRoomPass] = useState('');
  const [username, setUsername] = useState('');

  const currentLang = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];

  // In-memory persistent storage simulation
  const [rooms, setRooms] = useState<Record<string, Room>>(() => {
    const saved = localStorage.getItem('zaza_rooms');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('zaza_rooms', JSON.stringify(rooms));
  }, [rooms]);

  const handleCreateRoom = () => {
    if (!roomName.trim() || !username.trim()) return;
    if (rooms[roomName]) {
      setError("Bu isimde bir oda zaten var.");
      return;
    }

    const newRoom: Room = {
      id: Math.random().toString(36).substr(2, 9),
      name: roomName,
      password: roomPass,
      users: [username],
      messages: [
        {
          id: 'sys-1',
          sender: 'System',
          text: `${username} odayı oluşturdu.`,
          timestamp: Date.now(),
          type: 'system'
        }
      ]
    };

    setRooms(prev => ({ ...prev, [roomName]: newRoom }));
    setUser({ username, currentRoomId: newRoom.id });
    setActiveRoom(newRoom);
    setView('chat');
    setError(null);
  };

  const handleJoinRoom = () => {
    if (!roomName.trim() || !username.trim()) return;
    const room = rooms[roomName];
    if (!room) {
      setError(currentLang.translations.roomNotFound);
      return;
    }
    if (room.password && room.password !== roomPass) {
      setError(currentLang.translations.wrongPass);
      return;
    }
    if (room.users.includes(username)) {
      setError("Bu kullanıcı adı odada zaten mevcut.");
      return;
    }

    const updatedRoom = {
      ...room,
      users: [...room.users, username],
      messages: [
        ...room.messages,
        {
          id: Date.now().toString(),
          sender: 'System',
          text: `${username} katıldı.`,
          timestamp: Date.now(),
          type: 'system' as const
        }
      ]
    };

    setRooms(prev => ({ ...prev, [roomName]: updatedRoom }));
    setUser({ username, currentRoomId: updatedRoom.id });
    setActiveRoom(updatedRoom);
    setView('chat');
    setError(null);
  };

  const addMessage = (msg: Message) => {
    if (!activeRoom) return;
    const updatedRoom = {
      ...activeRoom,
      messages: [...activeRoom.messages, msg]
    };
    setRooms(prev => ({ ...prev, [activeRoom.name]: updatedRoom }));
    setActiveRoom(updatedRoom);
  };

  const handleExit = () => {
    if (activeRoom && user) {
      const updatedUsers = activeRoom.users.filter(u => u !== user.username);
      const updatedMessages: Message[] = [
        ...activeRoom.messages,
        {
          id: Date.now().toString(),
          sender: 'System',
          text: `${user.username} ayrıldı.`,
          timestamp: Date.now(),
          type: 'system'
        }
      ];

      const updatedRoom = {
        ...activeRoom,
        users: updatedUsers,
        messages: updatedMessages
      };

      // If room is empty, we could delete it, but for simplicity we keep it
      setRooms(prev => ({ ...prev, [activeRoom.name]: updatedRoom }));
    }
    setView('landing');
    setUser(null);
    setActiveRoom(null);
    setError(null);
    setRoomName('');
    setRoomPass('');
    setUsername('');
  };

  const handleBack = () => {
    setView('landing');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-purple-900/20 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-800/20 blur-[120px] rounded-full"></div>

      {/* Navbar */}
      <nav className="z-50 p-6 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md border-b border-zinc-800/50">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => view !== 'chat' && setView('landing')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-2xl font-bold">Z</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">ZazaChat</h1>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 px-4 py-2 rounded-full transition-all active:scale-95"
          >
            <span className="text-xl">{currentLang.flag}</span>
            <span className="hidden sm:inline font-medium">{currentLang.name}</span>
            <svg className={`w-4 h-4 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl z-[100] overflow-hidden py-1 animate-in fade-in zoom-in duration-200">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLangCode(l.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-600/20 transition-colors text-left ${langCode === l.code ? 'bg-purple-600/10 text-purple-400' : ''}`}
                >
                  <span className="text-xl">{l.flag}</span>
                  <span className="font-medium">{l.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 overflow-hidden">
        {view === 'landing' && (
          <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={() => setView('create')}
              className="group relative overflow-hidden bg-zinc-900/40 border border-zinc-800 hover:border-purple-500/50 p-10 rounded-3xl transition-all hover:shadow-[0_0_40px_rgba(124,58,237,0.1)] text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
              <div className="mb-6 w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">{currentLang.translations.createRoom}</h2>
              <p className="text-zinc-400 leading-relaxed">Yeni bir sohbet odası kur, şifre belirle ve arkadaşlarınla güvenle konuşmaya başla.</p>
            </button>

            <button 
              onClick={() => setView('join')}
              className="group relative overflow-hidden bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/50 p-10 rounded-3xl transition-all hover:shadow-[0_0_40px_rgba(79,70,229,0.1)] text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
              <div className="mb-6 w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">{currentLang.translations.joinRoom}</h2>
              <p className="text-zinc-400 leading-relaxed">Davet edildiğin odaya giriş yap, sohbete ve filmlere ortak ol.</p>
            </button>
          </div>
        )}

        {(view === 'create' || view === 'join') && (
          <div className="max-w-md w-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-wider">
              {view === 'create' ? currentLang.translations.createRoom : currentLang.translations.joinRoom}
            </h2>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">{currentLang.translations.username}</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınız"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-2xl px-5 py-4 outline-none transition-all placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">{currentLang.translations.roomName}</label>
                <input 
                  type="text" 
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Oda ismi"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-2xl px-5 py-4 outline-none transition-all placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">{currentLang.translations.roomPass}</label>
                <input 
                  type="password" 
                  value={roomPass}
                  onChange={(e) => setRoomPass(e.target.value)}
                  placeholder="Oda şifresi (Opsiyonel)"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-purple-500 rounded-2xl px-5 py-4 outline-none transition-all placeholder:text-zinc-600"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  {error}
                </div>
              )}

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  onClick={view === 'create' ? handleCreateRoom : handleJoinRoom}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-900/20 transition-all active:scale-95"
                >
                  {view === 'create' ? currentLang.translations.createBtn : currentLang.translations.joinBtn}
                </button>
                <button 
                  onClick={handleBack}
                  className="w-full text-zinc-400 hover:text-white font-medium py-3 transition-colors"
                >
                  {currentLang.translations.back}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'chat' && user && activeRoom && (
          <div className="w-full max-w-7xl h-[85vh] flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden">
            <ChatRoom 
              user={user} 
              room={activeRoom} 
              onMessage={addMessage} 
              lang={currentLang}
              onExit={handleExit}
            />
          </div>
        )}
      </main>
      
      {/* Footer Branding */}
      {view === 'landing' && (
        <footer className="p-8 text-center text-zinc-500 text-sm">
          &copy; 2024 ZazaChat. Tüm hakları saklıdır. Modern ve Güvenli Mesajlaşma.
        </footer>
      )}
    </div>
  );
};

export default App;
