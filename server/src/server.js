import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Qizzy Server is running smoothly 🚀' });
});

// Start Server & Initialize Database
app.listen(PORT, async () => {
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