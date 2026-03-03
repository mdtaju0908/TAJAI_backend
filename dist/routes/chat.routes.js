"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    console.log(`[Route] ${req.method} ${req.originalUrl}`);
    next();
});
router.post('/chat', chat_controller_1.handleChat);
router.post('/chat-json', chat_controller_1.handleChatJson);
router.get('/chats', chat_controller_1.listChats);
router.post('/chats', chat_controller_1.createChat);
router.get('/chat/:id', chat_controller_1.getChat);
router.patch('/chat/:id', chat_controller_1.renameChat);
router.delete('/chat/:id', chat_controller_1.deleteChat);
exports.default = router;
