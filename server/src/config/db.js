import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper function for queries
export async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// Auto-initialize schema by executing DDL statements individually
export async function initDatabase() {
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.log('⚡ Initializing Qizzy database tables on Cloud MySQL...');
      const schemaPath = path.resolve(__dirname, '../../../database/schema/Qizzy.sql');
      if (fs.existsSync(schemaPath)) {
        const rawSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Clean SQL comments and split into individual statements
        const statements = rawSql
          .replace(/--.*$/gm, '') // Remove single-line SQL comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => {
            if (!stmt) return false;
            const upper = stmt.toUpperCase();
            // Skip CREATE DATABASE and USE statements
            return !upper.startsWith('CREATE DATABASE') && !upper.startsWith('USE');
          });

        for (const stmt of statements) {
          if (stmt.length > 0) {
            await pool.query(stmt);
          }
        }
        console.log('✅ Database tables created successfully!');
      } else {
        console.error('⚠️ Could not find schema file at:', schemaPath);
      }
    } else {
      console.log('✅ Database schema ready (tables already exist).');
    }
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error.message);
  }
}
