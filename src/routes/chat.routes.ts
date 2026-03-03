import { Router } from 'express';
import {
  handleChat,
  handleChatJson,
  listChats,
  createChat,
  getChat,
  renameChat,
  deleteChat,
} from '../controllers/chat.controller';

const router = Router();

router.use((req, res, next) => {
  console.log(`[Route] ${req.method} ${req.originalUrl}`);
  next();
});

router.post('/chat', handleChat);
router.post('/chat-json', handleChatJson);

router.get('/chats', listChats);
router.post('/chats', createChat);

router.get('/chat/:id', getChat);
router.patch('/chat/:id', renameChat);
router.delete('/chat/:id', deleteChat);

export default router;
