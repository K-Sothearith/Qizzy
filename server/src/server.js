import express from 'express'
import dotenv from 'dotenv'
import { pool } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  
  try {
    const connection = await pool.getConnection();
    console.log("✅ Successfully connected to the MySQL Database cloud instance!");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed at startup:");
    console.error(error.message);
  }
});