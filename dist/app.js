"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const chat_controller_1 = require("./controllers/chat.controller");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((req, res, next) => {
    console.log(`[App] ${req.method} ${req.originalUrl}`);
    next();
});
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '2mb' }));
app.use('/api', chat_routes_1.default);
app.use(chat_controller_1.errorHandler);
exports.default = app;
