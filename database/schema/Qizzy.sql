-- ===================================================
-- Qizzy Database Schema DDL
-- Web-based Kahoot Alternative for Teaching & Quizzing
-- Optimized for Cloud MySQL (Aiven)
-- ===================================================

CREATE DATABASE IF NOT EXISTS qizzy;
USE qizzy;

-- ---------------------------------------------------
-- Table 1: users
-- Stores both Admin (Teacher/Host) and Student accounts.
-- Role-based access control (RBAC).
-- ---------------------------------------------------
DROP TABLE IF EXISTS player_answers;
DROP TABLE IF EXISTS session_players;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    total_score INT NOT NULL DEFAULT 0 COMMENT 'Cumulative total score across all quizzes',
    avg_score DECIMAL(7, 2) NOT NULL DEFAULT 0.00 COMMENT 'Average score achieved per completed quiz',
    quizzes_played INT NOT NULL DEFAULT 0 COMMENT 'Total number of quizzes completed by student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- Table 2: quizzes
-- Quizzes created exclusively by Admin users.
-- ---------------------------------------------------
CREATE TABLE quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    cover_image VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_quiz_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- Table 3: questions
-- Questions associated with a quiz.
-- ---------------------------------------------------
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false') NOT NULL DEFAULT 'multiple_choice',
    time_seconds INT NOT NULL DEFAULT 20 COMMENT 'Timer duration in seconds (e.g. 10, 20, 30, 60)',
    points INT NOT NULL DEFAULT 1000 COMMENT 'Base points for correct answer (e.g. 1000, 2000)',
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_question_quiz (quiz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- Table 4: options
-- Answer choices per question with Kahoot-style color & shape mapping.
-- ---------------------------------------------------
CREATE TABLE options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    color_shape ENUM('red_triangle', 'blue_diamond', 'yellow_circle', 'green_square') NOT NULL,
    order_index INT NOT NULL DEFAULT 1,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_option_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- Table 5: game_sessions
-- Live session instance created when an Admin hosts a quiz.
-- ---------------------------------------------------
CREATE TABLE game_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    host_id INT NOT NULL,
    pin_code VARCHAR(6) NOT NULL UNIQUE COMMENT '6-digit room join PIN',
    status ENUM('lobby', 'active', 'finished') NOT NULL DEFAULT 'lobby',
    current_question_index INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_pin (pin_code),
    INDEX idx_session_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- Table 6: session_players
-- Logged-in students participating in a live session.
-- ---------------------------------------------------
CREATE TABLE session_players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    total_score INT NOT NULL DEFAULT 0,
    streak INT NOT NULL DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_user (session_id, user_id),
    INDEX idx_sp_session (session_id),
    INDEX idx_sp_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------
-- Table 7: player_answers
-- Individual response logs per question per student.
-- ---------------------------------------------------
CREATE TABLE player_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    option_id INT NULL COMMENT 'NULL if time ran out without answer',
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    response_time_ms INT NOT NULL DEFAULT 0,
    points_earned INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE SET NULL,
    INDEX idx_pa_session (session_id),
    INDEX idx_pa_user (user_id),
    INDEX idx_pa_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;