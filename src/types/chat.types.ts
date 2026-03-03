export type ChatMode = 'normal' | 'thinking' | 'research' | 'search';

export interface ChatRequest {
  message: string;
  mode?: ChatMode;
}

export interface ChatResponse {
  reply: string;
}

export interface ChatMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatRecord {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
