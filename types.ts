
export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: 'text' | 'image' | 'system';
  content?: string; // For images (base64)
}

export interface Room {
  id: string;
  name: string;
  password?: string;
  messages: Message[];
  users: string[];
}

export interface User {
  username: string;
  currentRoomId: string | null;
}

export type AppLanguage = 'tr' | 'en' | 'zza' | 'ku' | 'de' | 'ar' | 'fr' | 'es';

export interface LanguageConfig {
  code: AppLanguage;
  name: string;
  flag: string;
  translations: {
    welcome: string;
    createRoom: string;
    joinRoom: string;
    roomName: string;
    roomPass: string;
    username: string;
    createBtn: string;
    joinBtn: string;
    roomNotFound: string;
    wrongPass: string;
    typeMessage: string;
    movieLink: string;
    watchBtn: string;
    sendPhoto: string;
    back: string;
  };
}
