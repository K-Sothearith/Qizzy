import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'qizzy_jwt_secret_key_2026_super_secure';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'qizzy2026admin';

// Helper to generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// @route   POST /api/auth/register
// @desc    Register a new Student or Admin user
export async function register(req, res) {
  try {
    const { name, email, password, role = 'student', adminPasscode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }

    // Role validation & Admin Passcode Check
    const userRole = role === 'admin' ? 'admin' : 'student';

    if (userRole === 'admin') {
      if (!adminPasscode || adminPasscode !== ADMIN_PASSCODE) {
        return res.status(403).json({ message: 'Invalid Admin Secret Passcode. Admin registration denied.' });
      }
    }

    // Check if user already exists
    const existingUsers = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'This email address is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const insertResult = await query(
      `INSERT INTO users (name, email, password_hash, role, total_score, avg_score, quizzes_played) 
       VALUES (?, ?, ?, ?, 0, 0.00, 0)`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, userRole]
    );

    const newUserId = insertResult.insertId;

    const newUser = {
      id: newUserId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: userRole,
      total_score: 0,
      avg_score: 0.00,
      quizzes_played: 0
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
}

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      total_score: user.total_score,
      avg_score: parseFloat(user.avg_score),
      quizzes_played: user.quizzes_played
    };

    const token = generateToken(userData);

    return res.json({
      message: 'Logged in successfully!',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
}

// @route   GET /api/auth/me
// @desc    Get current user profile & stats
export async function getMe(req, res) {
  try {
    const users = await query(
      'SELECT id, name, email, role, total_score, avg_score, quizzes_played, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];
    user.avg_score = parseFloat(user.avg_score);

    return res.json({ user });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({ message: 'Server error fetching user profile.', error: error.message });
  }
}
