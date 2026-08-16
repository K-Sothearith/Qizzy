import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import initGameSocket from './sockets/gameSocket.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send("Qizzy API Server is running.")
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Qizzy Server is running smoothly 🚀' });
});

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