# 🎯 Qizzy — Kahoot-Style Real-Time Quiz Application

**Qizzy** is a modern, full-stack, real-time interactive quiz platform created for educators, teachers, and student mentors. Built as a free, self-hosted alternative to Kahoot, Qizzy empowers teachers to host live interactive quizzes, keep students engaged with real-time speed scoring, and track student performance analytics over time without subscription paywalls or cloud storage bloat.

---

## 🚀 Key Highlights & Motivation

* **Paywall-Free & Self-Hosted**: Replaces commercial tools with a custom full-stack web app.
* **Storage-Optimized for Cloud MySQL**: Quiz creation privileges are strictly assigned to **Admin (Teacher)** accounts to prevent database bloat on free/starter cloud MySQL tiers (e.g. Aiven Cloud).
* **Account-Based Student Score Tracking**: Unlike Kahoot where guests are anonymous and ephemeral, students register accounts so teachers can track their total scores, average scores, and learning progress over time.
* **Admin Secret Passcode Verification**: Differentiates Admin and Student roles during signup using a secret environment-level passcode.
* **Speed-Weighted Real-Time Engine**: Built on Socket.io WebSockets for instant question broadcasting, synchronized countdown timers, fast player controller feedback, and dynamic speed scoring.

---

## 👥 Role Specifications & Access Control

Qizzy implements a strict **Role-Based Access Control (RBAC)** model:

### 1. 🎓 Student Role (Default)
* **Registration**: Standard signup requiring Name, Email, and Password.
* **Permissions**:
  * Log in to access the Student Dashboard.
  * Enter a 6-digit Game PIN to join live quiz sessions.
  * Interact with Kahoot-style color/shape button controllers (Red Triangle, Blue Diamond, Yellow Circle, Green Square).
  * View real-time rank, streak bonuses, and instant feedback.
  * View historical overall stats: **Total Score**, **Average Score per Quiz**, and **Quizzes Played**.
* **Restrictions**: **Cannot create, edit, or host quizzes** (preserves cloud database quota).

### 2. 👑 Admin Role (Teacher / Host)
* **Registration**: Requires selecting "Admin" on the signup page and providing the secret **Admin Passcode** (configured via `ADMIN_PASSCODE` in the server environment).
* **Permissions**:
  * Full Quiz Management: Create, edit, preview, and delete quizzes.
  * Question Builder: Add Multiple-Choice (4 options) or True/False questions with customizable time limits (10s, 20s, 30s, 60s) and points (Standard 1000, Double 2000).
  * Host Live Room: Launch game rooms with automatically generated 6-digit PIN codes.
  * Host Live View (Projector Mode):
    * **Dynamic Room QR Code & Game PIN Display**: Auto-generates a QR code on screen so students can scan with mobile cameras to auto-join with the Game PIN.
    * Real-time lobby displaying joining students.
    * Synchronized question countdown timer.
    * Live answer distribution chart & answer reveal slide.
    * Top 5 Leaderboard after each question.
    * Final Podium celebration (1st, 2nd, 3rd place with confetti animation).
  * View student overall statistics and performance logs.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | High-performance SPA with modern component model |
| **Icons & Visuals** | Lucide React + Canvas-Confetti + QRCode.react | Modern UI icons, podium celebration effects & client-side room QR code generation |
| **Real-Time Client** | Socket.io Client | WebSocket event listener and real-time state sync |
| **Backend Framework** | Node.js + Express 5 | RESTful API routes & HTTP server |
| **Real-Time Engine** | Socket.io | Bi-directional room-based event broadcasting |
| **Security & Auth** | JWT (`jsonwebtoken`) + `bcryptjs` | Token authentication and password hashing |
| **Database** | MySQL (Cloud Aiven Hosted) | Structured database storage using `mysql2/promise` |

---

## 🗄️ Database Schema & DDL Reference

The database is structured into 7 normalized tables designed to minimize storage consumption while storing complete quiz results.

### Entity-Relationship Overview

```
[ users ] (1) <--- (N) [ quizzes ] (1) <--- (N) [ questions ] (1) <--- (N) [ options ]
    ^                                                    ^
    |                                                    |
    +---- (N) <--- [ session_players ] (N) ---> (1) [ game_sessions ]
    |                                                    ^
    +---- (N) <--- [ player_answers ]  (N) --------------+
```

### Table Details

#### 1. `users`
Stores user credentials, role permissions, and aggregated student performance counters.
* `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
* `name` (`VARCHAR(100)`)
* `email` (`VARCHAR(150) UNIQUE`)
* `password_hash` (`VARCHAR(255)`)
* `role` (`ENUM('student', 'admin') DEFAULT 'student'`)
* `total_score` (`INT DEFAULT 0`) — *Cumulative total points earned across all quizzes*
* `avg_score` (`DECIMAL(7, 2) DEFAULT 0.00`) — *Average score achieved per completed quiz*
* `quizzes_played` (`INT DEFAULT 0`) — *Total number of completed quizzes*
* `created_at`, `updated_at` (`TIMESTAMP`)

#### 2. `quizzes`
Quiz meta-information created exclusively by Admin users.
* `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
* `admin_id` (`INT`, Foreign Key $\rightarrow$ `users.id` `ON DELETE CASCADE`)
* `title` (`VARCHAR(255)`)
* `description` (`TEXT`)
* `cover_image` (`VARCHAR(500)`)
* `created_at`, `updated_at` (`TIMESTAMP`)

#### 3. `questions`
Questions belonging to a quiz.
* `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
* `quiz_id` (`INT`, Foreign Key $\rightarrow$ `quizzes.id` `ON DELETE CASCADE`)
* `question_text` (`TEXT`)
* `question_type` (`ENUM('multiple_choice', 'true_false') DEFAULT 'multiple_choice'`)
* `time_seconds` (`INT DEFAULT 20`)
* `points` (`INT DEFAULT 1000`)
* `order_index` (`INT DEFAULT 1`)

#### 4. `options`
Answer choices with Kahoot-style visual attributes.
* `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
* `question_id` (`INT`, Foreign Key $\rightarrow$ `questions.id` `ON DELETE CASCADE`)
* `option_text` (`VARCHAR(255)`)
* `is_correct` (`BOOLEAN DEFAULT FALSE`)
* `color_shape` (`ENUM('red_triangle', 'blue_diamond', 'yellow_circle', 'green_square')`)
* `order_index` (`INT DEFAULT 1`)

#### 5. `game_sessions`
Live session instances launched by an Admin.
* `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
* `quiz_id` (`INT`, Foreign Key $\rightarrow$ `quizzes.id`)
* `host_id` (`INT`, Foreign Key $\rightarrow$ `users.id`)
* `pin_code` (`VARCHAR(6) UNIQUE`)
* `status` (`ENUM('lobby', 'active', 'finished') DEFAULT 'lobby'`)
* `current_question_index` (`INT DEFAULT 0`)
* `started_at`, `ended_at`, `created_at` (`TIMESTAMP`)

#### 6. `session_players`
Tracks registered students who joined an active session.
* `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
* `session_id` (`INT`, Foreign Key $\rightarrow$ `game_sessions.id`)
* `user_id` (`INT`, Foreign Key $\rightarrow$ `users.id`)
* `total_score` (`INT DEFAULT 0`)
* `streak` (`INT DEFAULT 0`)
* `joined_at` (`TIMESTAMP`)

#### 7. `player_answers`
Log of every submitted answer per student per question.
* `id` (`INT AUTO_INCREMENT PRIMARY KEY`)
* `session_id` (`INT`, Foreign Key $\rightarrow$ `game_sessions.id`)
* `user_id` (`INT`, Foreign Key $\rightarrow$ `users.id`)
* `question_id` (`INT`, Foreign Key $\rightarrow$ `questions.id`)
* `option_id` (`INT`, Foreign Key $\rightarrow$ `options.id`)
* `is_correct` (`BOOLEAN DEFAULT FALSE`)
* `response_time_ms` (`INT DEFAULT 0`)
* `points_earned` (`INT DEFAULT 0`)

---

## ⚡ Speed Scoring Formula

Qizzy implements Kahoot's signature response speed scoring algorithm. Faster correct answers yield higher points:

$$\text{Points Earned} = \text{Base Points} \times \left(1 - \frac{\text{Response Time (ms)}}{\text{Time Limit (ms)} \times 2}\right)$$

* Max points possible per question = **Base Points** (e.g. 1000).
* Minimum points earned for a correct answer at the last millisecond = **50% of Base Points** (e.g. 500).
* Incorrect or missed answers yield **0 points** and reset the player's active **Streak** counter.

---

## 🔄 System Workflows & Event Sequences

### 1. Signup & Admin Passcode Workflow
```
[User] ---> Fills Register Form (Name, Email, Password, Role)
              |
              +---> Selects "Student" ---> POST /api/auth/register ---> User created (role='student')
              |
              +---> Selects "Admin"   ---> Dynamic Passcode Field appears
                                             |
                                             +---> Fills Passcode ---> POST /api/auth/register
                                                                           |
                                                                           +---> Passcode Matches ADMIN_PASSCODE?
                                                                                   ├── YES: User created (role='admin')
                                                                                   └── NO:  Return 403 Forbidden
```

### 2. QR Code Scanning & Auto-Join Workflow
```
[Student Mobile] ---> Scans Projector QR Code (URL: /join?pin=849201)
                         |
                         +---> Is Student Logged In?
                                 ├── NO:  Redirect to Login / Signup (preserves target pin=849201)
                                 │        └─> Authenticates successfully
                                 │
                                 └── YES: Proceed directly
                                              |
                                              v
                                   [Enter / Confirm Nickname] ---> Emits: join-game(PIN, JWT_Token, Nickname)
                                                                       |
                                                                       v
                                                           [Straight to Live Waiting Lobby!]
```

### 3. Live Session & Socket Event Flow
```
[Admin Host]                      [Socket Server]                     [Student Player]
     |                                  |                                     |
     |--- create-host-room(quiz_id) --->|                                     |
     |<-- room-created(PIN: 849201) ----|                                     |
     |                                  |<-- join-game(PIN, JWT_Token) -------|
     |<-- player-joined(student_info) --|                                     |
     |                                  |                                     |
     |--- start-quiz ------------------>|--- question-start ----------------->|
     |                                  |   (question, options, timer)        |
     |                                  |                                     |
     |                                  |<-- submit-answer -------------------|
     |<-- answer-count-update ----------|    (option_id, response_time)       |
     |                                  |                                     |
     |--- reveal-answer --------------->|--- answer-result ------------------>|
     |   (show graph & correct option)  |   (points_gained, streak, rank)     |
     |                                  |                                     |
     |--- show-leaderboard ------------>|--- leaderboard-update ------------->|
     |                                  |                                     |
     |--- finish-game ----------------->|--- game-over ---------------------->|
     |   (show 3D podium & save scores) |   (final score & updated totals)    |
```

---

## 📂 Repository Directory Structure

```
Qizzy/
├── README.md                      # Comprehensive System Documentation
├── database/
│   └── schema/
│       └── Qizzy.sql              # Production DDL schema script
├── server/
│   ├── .env                       # Cloud MySQL credentials & ADMIN_PASSCODE
│   ├── package.json               # Backend dependencies (Express, Socket.io, MySQL2)
│   └── src/
│       ├── config/                # Database pool connection setup
│       ├── controllers/           # Auth & Quiz REST handlers
│       ├── middlewares/           # JWT & RBAC requireAdmin middleware
│       ├── models/                # Database query helpers
│       ├── routes/                # Express API routes
│       ├── sockets/               # Socket.io game room engine
│       └── server.js              # Entry point server
└── client/
    ├── package.json               # Frontend dependencies (React 19, Socket.io-client)
    ├── vite.config.js             # Vite build configuration
    └── src/
        ├── assets/                # App logos and artwork
        ├── components/            # Reusable UI components
        ├── context/               # AuthContext & SocketContext
        ├── pages/                 # Login, Register, AdminDashboard, StudentDashboard, HostRoom, PlayerRoom
        ├── services/              # API and socket helper functions
        ├── App.jsx                # Router & Protected Route wrapper
        └── main.jsx               # React DOM entry point
```

---

## 💻 Local Setup & Execution Guide

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **MySQL**: Local instance or Cloud MySQL (Aiven)
* **npm**: v9.0.0 or higher

### 1. Database Setup
1. Import `database/schema/Qizzy.sql` into your MySQL server:
   ```bash
   mysql -u <username> -p < database/schema/Qizzy.sql
   ```

### 2. Backend Server Setup
1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Verify `.env` file configuration:
   ```env
   DB_HOST=your_mysql_host
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=qizzy
   DB_PORT=3306
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   ADMIN_PASSCODE=your_admin_secret_passcode
   ```
3. Install dependencies & start dev server:
   ```bash
   npm install
   npm run dev
   ```

### 3. Frontend Client Setup
1. Open a new terminal and navigate to the `client/` directory:
   ```bash
   cd client
   ```
2. Install dependencies & start Vite server:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## 📄 License
This project is open-source and intended for educational and teaching purposes.

--

## 🎯 Sprint Breakdown
### 🟢 Sprint 1: Core Foundation & Role-Based Auth (Proposed for Immediate Execution)
Backend (server/):
MySQL connection pool (src/config/db.js).
JWT verification & Role-Based Access Control (src/middlewares/authMiddleware.js).
Authentication Endpoints (src/controllers/authController.js & src/routes/authRoutes.js):
Signup: Handles role='student' and role='admin'. Validates ADMIN_PASSCODE against .env when Admin is selected. Hashes passwords with bcryptjs.
Login: Authenticates credentials, returns signed JWT containing userId, role, name, email.
Profile endpoint (/api/auth/me): Fetches current user profile and stats.
Express server integration (src/server.js) with CORS & JSON body parsing.
Frontend (client/):
Global Design System (src/index.css) — Dark glassmorphic theme, vibrant color variables, modern typography (Outfit/Inter), responsive layout reset.
Auth Context & Token Management (src/context/AuthContext.jsx).
Router setup (src/App.jsx) with protected routes (ProtectedRoute for logged-in users, AdminRoute for Admin users).
Login View (src/pages/Login.jsx).
Register View (src/pages/Register.jsx) featuring dynamic role selector (Student/Admin) and smooth slide-in for the secret Admin Passcode field.
Basic Dashboard Layouts & Placeholders (src/pages/StudentDashboard.jsx, src/pages/AdminDashboard.jsx).
### 🔵 Sprint 2: Admin Quiz Builder & Management
Backend:
Quiz CRUD API (src/controllers/quizController.js & src/routes/quizRoutes.js).
Endpoints for creating, updating, deleting quizzes, questions, and options.
Restricted strictly to users with role='admin'.
Frontend:
Admin Quiz Library View (AdminDashboard.jsx).
Visual Quiz Builder (src/pages/QuizEditor.jsx): Interactive question cards, 4 color/shape option inputs (Red Triangle, Blue Diamond, Yellow Circle, Green Square), time limit selector (10s, 20s, 30s, 60s), base point settings.
### 🟣 Sprint 3: Real-Time Engine, Socket.io & Live Gameplay
Backend:
Socket.io server engine (src/sockets/gameSocket.js): Room PIN creation, student JWT room joining, synchronized question timer, response handling, Kahoot speed-based scoring math, leaderboard computation, and saving scores to MySQL database.
Frontend:
Host Room (src/pages/HostRoom.jsx): Projector view with Room PIN, Dynamic QRCode (qrcode.react), live student lobby, question countdown, response chart, top 5 leaderboard, and 3D confetti podium (canvas-confetti).
Player Room (src/pages/PlayerRoom.jsx): QR Code auto-join URL handler (/join?pin=849201), nickname entry, 4-color shape controller grid, instant feedback & streak counter.
### 🟡 Sprint 4: Student Analytics, UX Polish & Audio/Visual Effects
Frontend:
Student Dashboard analytics (total_score, avg_score, quizzes_played, completed quiz history).
Sound FX audio toggle (quiz lobby music, countdown tick, correct/incorrect chimes).
Mobile UI & edge-case error handling polish.
