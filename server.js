import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { streamText, convertToCoreMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const chats = new Map();
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const resolveStreamingModel = (mode) => {
  if (mode === 'thinking' || mode === 'research') return 'gemini-1.5-pro';
  return 'gemini-1.5-flash';
};
const resolveJsonModel = (mode) => {
  if (mode === 'thinking' || mode === 'research') return 'gemini-1.5-pro';
  if (mode === 'search') return 'gemini-1.5-flash';
  return 'gemini-3-flash-preview';
};
const buildModeInstruction = (mode) => {
  if (mode === 'thinking') return 'Provide a detailed, thorough explanation with clear reasoning and examples.';
  if (mode === 'research') return 'Provide a long, structured answer with headings, step-by-step reasoning, and academic tone.';
  if (mode === 'search') return 'Answer with up-to-date information and include a Sources section. If live web access is unavailable, say so.';
  return '';
};

app.use(cors({ origin: 'http://localhost:3000', exposedHeaders: ['X-Chat-Id'] }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/chats', async (req, res) => {
  try {
    const list = Array.from(chats.values())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map(c => ({ _id: c._id, title: c.title, updatedAt: c.updatedAt }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const title = (req.body && req.body.title) || 'New Chat';
    const _id = randomUUID();
    const now = new Date().toISOString();
    const chat = { _id, title, updatedAt: now, messages: [] };
    chats.set(_id, chat);
    res.status(201).json({ _id, title, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

app.get('/api/chat/:id', async (req, res) => {
  try {
    const chat = chats.get(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Not found' });
    res.json(chat);
  } catch {
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

app.patch('/api/chat/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const chat = chats.get(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Not found' });
    chat.title = title || chat.title;
    chat.updatedAt = new Date().toISOString();
    chats.set(chat._id, chat);
    res.json(chat);
  } catch {
    res.status(500).json({ error: 'Failed to rename chat' });
  }
});

app.delete('/api/chat/:id', async (req, res) => {
  try {
    chats.delete(req.params.id);
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, chatId, mode } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).send('Messages are required');
    }

    const modeInstruction = buildModeInstruction(mode);
    const coreMessages = convertToCoreMessages(messages);
    const finalMessages = modeInstruction
      ? [{ role: 'system', content: modeInstruction }, ...coreMessages]
      : coreMessages;
    const lastUserMessage = messages[messages.length - 1];

    let currentChatId = chatId;
    if (!currentChatId) {
      const title = lastUserMessage.content.slice(0, 30) + (lastUserMessage.content.length > 30 ? '...' : '');
      currentChatId = randomUUID();
      const now = new Date().toISOString();
      chats.set(currentChatId, { _id: currentChatId, title, updatedAt: now, messages: [lastUserMessage] });
    } else {
      const chat = chats.get(currentChatId) || { _id: currentChatId, title: 'Untitled', updatedAt: new Date().toISOString(), messages: [] };
      chat.messages.push(lastUserMessage);
      chat.updatedAt = new Date().toISOString();
      chats.set(currentChatId, chat);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Chat-Id', currentChatId);

    const result = await streamText({
      model: google(resolveStreamingModel(mode)),
      messages: finalMessages,
      onFinish: async ({ text }) => {
        if (currentChatId) {
          const chat = chats.get(currentChatId);
          if (chat) {
            chat.messages.push({ role: 'assistant', content: text, createdAt: new Date() });
            chat.updatedAt = new Date().toISOString();
            chats.set(currentChatId, chat);
          }
        }
      },
    });

    const nodeStream = result.toNodeStream();
    nodeStream.pipe(res);
  } catch (error) {
    console.error('Error in chat API:', error);
    res.status(500).send('Failed to process chat');
  }
});

app.post('/api/chat-json', async (req, res) => {
  try {
    const { messages, chatId, mode } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages are required' });
    }
    const lastUserMessage = messages[messages.length - 1];
    let currentChatId = chatId;
    if (!currentChatId) {
      const title = lastUserMessage.content.slice(0, 30) + (lastUserMessage.content.length > 30 ? '...' : '');
      currentChatId = randomUUID();
      const now = new Date().toISOString();
      chats.set(currentChatId, { _id: currentChatId, title, updatedAt: now, messages: [lastUserMessage] });
    } else {
      const chat = chats.get(currentChatId) || { _id: currentChatId, title: 'Untitled', updatedAt: new Date().toISOString(), messages: [] };
      chat.messages.push(lastUserMessage);
      chat.updatedAt = new Date().toISOString();
      chats.set(currentChatId, chat);
    }
    const modeInstruction = buildModeInstruction(mode);
    const prompt = modeInstruction ? `${modeInstruction}\n\n${lastUserMessage.content}` : lastUserMessage.content;
    const response = await genAI.models.generateContent({
      model: resolveJsonModel(mode),
      contents: prompt,
    });
    const text = response?.text || '';
    if (currentChatId) {
      const chat = chats.get(currentChatId);
      if (chat) {
        chat.messages.push({ role: 'assistant', content: text, createdAt: new Date() });
        chat.updatedAt = new Date().toISOString();
        chats.set(currentChatId, chat);
      }
    }
    res.json({ reply: text, chatId: currentChatId });
  } catch (error) {
    console.error('Error in chat-json API:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

app.listen(PORT, () => {
  console.log(`TAJ AI backend listening on http://localhost:${PORT}`);
});
