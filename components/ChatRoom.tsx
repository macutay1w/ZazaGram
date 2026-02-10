
import React, { useState, useRef, useEffect } from 'react';
import { User, Room, Message, LanguageConfig } from '../types';
import { GoogleGenAI } from "@google/genai";

interface Props {
  user: User;
  room: Room;
  onMessage: (msg: Message) => void;
  lang: LanguageConfig;
  onExit: () => void;
}

const ChatRoom: React.FC<Props> = ({ user, room, onMessage, lang, onExit }) => {
  const [text, setText] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});
  const [showUserList, setShowUserList] = useState(false); // Default to false as requested
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [room.messages]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const translateMessage = async (msgId: string, messageText: string) => {
    if (translations[msgId]) return;
    
    setIsTranslating(prev => ({ ...prev, [msgId]: true }));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following text into ${lang.name}. Only provide the translation, no extra text: "${messageText}"`,
      });
      
      const translatedText = response.text || "Çeviri yapılamadı.";
      setTranslations(prev => ({ ...prev, [msgId]: translatedText }));
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(prev => ({ ...prev, [msgId]: false }));
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      setIsCameraOpen(true);
      setCapturedImage(null);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      }, 100);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kameraya erişim izni verin.");
      } else {
        setCameraError("Kamera başlatılırken bir hata oluştu.");
      }
      setIsCameraOpen(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setCapturedImage(dataUrl);
      }
    }
  };

  const sendImage = (imageData: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      sender: user.username,
      text: '',
      timestamp: Date.now(),
      type: 'image',
      content: imageData
    };
    onMessage(msg);
    setFilePreview(null);
    stopCamera();
  };

  const handleSendText = () => {
    if (!text.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender: user.username,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'text'
    };
    onMessage(msg);
    setText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendText();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-row w-full h-full relative overflow-hidden bg-zinc-950/20 rounded-[2rem] border border-zinc-800/50">
      
      {/* File Upload Preview Overlay */}
      {filePreview && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400">Resim Önizleme</h3>
              <button onClick={() => setFilePreview(null)} className="text-zinc-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-4 bg-zinc-950 flex items-center justify-center min-h-[300px]">
              <img src={filePreview} alt="Upload preview" className="max-h-[400px] w-auto rounded-xl shadow-lg" />
            </div>
            <div className="p-4 flex gap-3">
              <button 
                onClick={() => setFilePreview(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-all"
              >
                İptal
              </button>
              <button 
                onClick={() => sendImage(filePreview)}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Overlay Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl">
            <div className="p-4 flex justify-between items-center border-b border-zinc-800">
              <h3 className="font-bold text-purple-400 uppercase tracking-widest text-sm">Kamera</h3>
              <button onClick={stopCamera} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {cameraError ? (
                <div className="p-10 text-center space-y-4">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  </div>
                  <p className="text-zinc-300 font-medium leading-relaxed">{cameraError}</p>
                  <button onClick={stopCamera} className="bg-zinc-800 px-6 py-2 rounded-xl hover:bg-zinc-700 transition-all">Kapat</button>
                </div>
              ) : !capturedImage ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {!cameraError && (
              <div className="p-8 flex justify-center gap-4">
                {!capturedImage ? (
                  <button 
                    onClick={capturePhoto}
                    aria-label="Fotoğraf çek"
                    className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all flex items-center justify-center group"
                  >
                    <div className="w-12 h-12 bg-white rounded-full group-active:scale-90 transition-transform"></div>
                  </button>
                ) : (
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => setCapturedImage(null)}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-4 rounded-2xl font-bold transition-all"
                    >
                      Tekrar Çek
                    </button>
                    <button 
                      onClick={() => sendImage(capturedImage)}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-purple-900/20"
                    >
                      Gönder
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Box */}
      <section className="flex-1 flex flex-col bg-zinc-900/40 backdrop-blur-3xl overflow-hidden h-full relative z-0">
        {/* Header */}
        <header className="px-8 py-5 bg-zinc-900/60 border-b border-zinc-800/50 flex justify-between items-center backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowUserList(!showUserList)}
              className={`p-3 rounded-2xl transition-all border flex items-center gap-2 ${
                showUserList 
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/20' 
                : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white border-zinc-700/50'
              }`}
              title="Katılımcıları Gör"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Katılımcılar</span>
            </button>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                {room.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">ODA AKTİF</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onExit}
              className="px-5 py-2.5 rounded-2xl bg-zinc-800/50 hover:bg-red-600/20 hover:text-red-400 border border-zinc-700/50 hover:border-red-500/30 text-zinc-300 font-bold text-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7"></path></svg>
              AYRIL
            </button>
          </div>
        </header>

        {/* Message Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {room.messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.type === 'system' ? 'items-center' : m.sender === user.username ? 'items-end' : 'items-start'}`}>
              {m.type === 'system' ? (
                <div className="flex items-center gap-3 w-full opacity-60">
                  <div className="h-px bg-zinc-800 flex-1"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900 px-4 py-1.5 rounded-full border border-zinc-800">
                    {m.text}
                  </span>
                  <div className="h-px bg-zinc-800 flex-1"></div>
                </div>
              ) : (
                <div className="max-w-[80%] group">
                  <div className={`flex items-center gap-3 mb-2 px-1 ${m.sender === user.username ? 'justify-end' : ''}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{m.sender}</span>
                    <span className="text-[9px] text-zinc-600 font-bold">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  <div className="relative">
                    <div className={`p-5 rounded-[2rem] shadow-xl transition-all ${
                      m.sender === user.username 
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-700 rounded-tr-none text-white ring-1 ring-white/10' 
                      : 'bg-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 rounded-tl-none text-zinc-100'
                    }`}>
                      {m.type === 'text' ? (
                        <div className="space-y-3">
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-medium">{m.text}</p>
                          {translations[m.id] && (
                            <div className="mt-4 pt-4 border-t border-white/10 text-xs italic text-zinc-200 bg-black/20 p-4 rounded-2xl">
                              <span className="text-[9px] font-black uppercase block mb-2 opacity-50 tracking-widest">{lang.name} ÇEVİRİSİ</span>
                              {translations[m.id]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                           <img src={m.content} alt="shared" className="max-h-72 object-cover w-full cursor-zoom-in hover:scale-[1.02] transition-transform duration-500" />
                        </div>
                      )}
                    </div>

                    {/* Translation Button */}
                    {m.type === 'text' && !translations[m.id] && (
                      <button 
                        onClick={() => translateMessage(m.id, m.text)}
                        disabled={isTranslating[m.id]}
                        className={`absolute top-0 ${m.sender === user.username ? '-left-12' : '-right-12'} p-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-all text-zinc-400 hover:text-white shadow-2xl border border-zinc-700/50 backdrop-blur-xl`}
                        title="Metni Çevir"
                      >
                        {isTranslating[m.id] ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <footer className="p-8 bg-zinc-900/60 border-t border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-4 max-w-5xl mx-auto">
            <div className="flex gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-4 bg-zinc-800/80 hover:bg-zinc-700 rounded-[1.5rem] text-zinc-400 hover:text-white transition-all border border-zinc-700/50 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </button>
              <button 
                onClick={startCamera}
                className="p-4 bg-zinc-800/80 hover:bg-zinc-700 rounded-[1.5rem] text-zinc-400 hover:text-white transition-all border border-zinc-700/50 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 relative group">
              <input 
                type="text" 
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={lang.translations.typeMessage}
                className="w-full bg-zinc-950/80 border border-zinc-800/50 focus:border-purple-500/50 rounded-[1.75rem] px-8 py-4 outline-none transition-all placeholder:text-zinc-600 font-medium text-white shadow-inner"
              />
              <button 
                onClick={handleSendText}
                className="absolute right-2 top-2 bottom-2 px-6 bg-purple-600 hover:bg-purple-500 rounded-[1.25rem] text-white shadow-xl shadow-purple-900/40 transition-all active:scale-95 font-black tracking-widest text-[10px]"
              >
                GÖNDER
              </button>
            </div>
          </div>
        </footer>
      </section>

      {/* User List Sidebar */}
      <aside className={`${showUserList ? 'w-full md:w-80 border-l border-zinc-800/50' : 'w-0 overflow-hidden'} flex flex-col transition-all duration-300 h-full bg-zinc-900/60 backdrop-blur-2xl relative z-20`}>
        <div className="p-7 border-b border-zinc-800/50 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">KATILIMCILAR ({room.users.length})</h3>
          <button onClick={() => setShowUserList(false)} className="text-zinc-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {room.users.map((username) => (
            <div 
              key={username} 
              className={`group flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 ${
                username === user.username 
                ? 'bg-purple-600/10 border border-purple-500/20' 
                : 'hover:bg-zinc-800/40 border border-transparent'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center font-black text-lg text-white group-hover:scale-110 transition-transform shadow-lg uppercase">
                  {username.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-[3px] border-zinc-900 rounded-full shadow-md"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
                  {username}
                </span>
                <div className="flex items-center gap-1">
                   {username === user.username ? (
                    <span className="text-[9px] text-purple-400 font-black uppercase tracking-tighter">Siz</span>
                  ) : (
                    <span className="text-[9px] text-zinc-500 font-medium">Aktif</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-zinc-900/40 border-t border-zinc-800/50">
           <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 text-center">ODA KODU</div>
           <div className="text-xs font-mono text-zinc-300 bg-zinc-950/50 py-3 rounded-2xl border border-zinc-800/50 text-center shadow-inner">
             {room.id}
           </div>
        </div>
      </aside>

      {/* Overlay for mobile when user list is open */}
      {showUserList && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-10 md:hidden"
          onClick={() => setShowUserList(false)}
        />
      )}
    </div>
  );
};

export default ChatRoom;
