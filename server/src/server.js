import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import initGameSocket from './sockets/gameSocket.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Serve static frontend in production if client/dist exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Qizzy Server is running smoothly 🚀' });
});

// SPA Client Fallback for React Router (Express 5 compatible)
if (fs.existsSync(clientDistPath)) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send("Qizzy API Server is running.");
  });
}

// Create HTTP Server & Attach Socket.io
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize real-time Socket.io game logic
initGameSocket(io);

// Start Server & Initialize Database
httpServer.listen(PORT, async () => {
  console.log(`🚀 Qizzy Server running on http://localhost:${PORT}`);
  
  try {
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to Cloud MySQL Database instance!');
    connection.release();
    await initDatabase();
  } catch (error) {
    console.error('❌ Cloud MySQL connection error:', error.message);
  }
});