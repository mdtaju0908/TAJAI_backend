import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.routes';
import { errorHandler } from './controllers/chat.controller';

dotenv.config();

const app = express();

app.use((req, res, next) => {
  console.log(`[App] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(
  cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '2mb' }));

app.use('/api', chatRoutes);

app.use(errorHandler);

export default app;
