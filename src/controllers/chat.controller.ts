import { Request, Response, NextFunction } from 'express';
import { generateReply } from '../config/gemini';
import type { ChatMode, ChatRecord, ChatRequest, ChatMessage } from '../types/chat.types';

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const chats = new Map<string, ChatRecord>();

const createId = () => `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const now = () => new Date().toISOString();

const normalizeMode = (mode?: string): ChatMode => {
  if (mode === 'thinking' || mode === 'research' || mode === 'search') return mode;
  return 'normal';
};

const getLastUserMessage = (messages: any[]): string | null => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg && msg.role === 'user' && typeof msg.content === 'string') {
      return msg.content;
    }
  }
  return null;
};

const buildTitle = (content: string) => {
  const trimmed = content.trim();
  if (!trimmed) return 'New Chat';
  return trimmed.length > 50 ? `${trimmed.slice(0, 50)}...` : trimmed;
};

const addMessage = (chat: ChatRecord, role: 'user' | 'assistant', content: string) => {
  const message: ChatMessage = {
    _id: createId(),
    role,
    content,
    createdAt: now(),
  };
  chat.messages.push(message);
  chat.updatedAt = message.createdAt;
};

export const handleChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[Controller] /chat body', req.body);
    const { message, mode }: ChatRequest = req.body || {};
    if (!message || typeof message !== 'string') {
      throw new HttpError(400, 'Message is required');
    }
    const selectedMode = normalizeMode(mode);
    const reply = await generateReply(message, selectedMode);
    console.log('[Controller] /chat reply', reply?.slice?.(0, 120));
    res.status(200).json({ success: true, reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Controller] /chat error', message);
    res.status(err instanceof HttpError ? err.status : 500).json({ success: false, error: message });
  }
};

export const handleChatJson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[Controller] /chat-json body', req.body);
    const { messages, chatId, mode } = req.body || {};
    if (!Array.isArray(messages)) {
      throw new HttpError(400, 'Messages array is required');
    }
    const lastUserMessage = getLastUserMessage(messages);
    if (!lastUserMessage) {
      throw new HttpError(400, 'User message is required');
    }
    const selectedMode = normalizeMode(typeof mode === 'string' ? mode : undefined);
    const reply = await generateReply(lastUserMessage, selectedMode);
    console.log('[Controller] /chat-json reply', reply?.slice?.(0, 120));

    let chat: ChatRecord | undefined;
    if (typeof chatId === 'string') {
      chat = chats.get(chatId);
    }
    if (!chat) {
      const newId = createId();
      const timestamp = now();
      chat = {
        _id: newId,
        title: buildTitle(lastUserMessage),
        createdAt: timestamp,
        updatedAt: timestamp,
        messages: [],
      };
      chats.set(newId, chat);
    }

    addMessage(chat, 'user', lastUserMessage);
    addMessage(chat, 'assistant', reply);

    res.status(200).json({ success: true, reply, chatId: chat._id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Controller] /chat-json error', message);
    res.status(err instanceof HttpError ? err.status : 500).json({ success: false, error: message });
  }
};

export const listChats = (req: Request, res: Response) => {
  const items = Array.from(chats.values())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(chat => ({
      _id: chat._id,
      title: chat.title,
      updatedAt: chat.updatedAt,
    }));
  res.json(items);
};

export const createChat = (req: Request, res: Response) => {
  const { title } = req.body || {};
  const chatTitle = typeof title === 'string' && title.trim() ? title.trim() : 'New Chat';
  const timestamp = now();
  const chat: ChatRecord = {
    _id: createId(),
    title: chatTitle,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
  chats.set(chat._id, chat);
  res.json(chat);
};

export const getChat = (req: Request, res: Response, next: NextFunction) => {
  const id = String(req.params.id);
  const chat = chats.get(id);
  if (!chat) {
    return next(new HttpError(404, 'Chat not found'));
  }
  res.json(chat);
};

export const renameChat = (req: Request, res: Response, next: NextFunction) => {
  const id = String(req.params.id);
  const { title } = req.body || {};
  if (!title || typeof title !== 'string') {
    return next(new HttpError(400, 'Title is required'));
  }
  const chat = chats.get(id);
  if (!chat) {
    return next(new HttpError(404, 'Chat not found'));
  }
  chat.title = title.trim() || 'Untitled';
  chat.updatedAt = now();
  res.json(chat);
};

export const deleteChat = (req: Request, res: Response, next: NextFunction) => {
  const id = String(req.params.id);
  const chat = chats.get(id);
  if (!chat) {
    return next(new HttpError(404, 'Chat not found'));
  }
  chats.delete(id);
  res.json({ success: true });
};

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(status).json({ success: false, error: message });
};
