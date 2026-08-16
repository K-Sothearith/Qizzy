import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

// In-memory active game rooms store
// Key: pinCode -> room object
const rooms = new Map();

/**
 * Helper to generate a unique 6-digit PIN
 */
function generatePin() {
  let pin;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(pin));
  return pin;
}

/**
 * Rule-based witty quote generator based on response time vs time limit
 */
function getWittyQuote(responseTimeMs, timeLimitSeconds) {
  const timeLimitMs = timeLimitSeconds * 1000;
  const ratio = responseTimeMs / timeLimitMs;

  if (ratio <= 0.25) {
    const fastQuotes = [
      'Fast as a bullet, huh? ⚡',
      'Feeling so confident? 😎',
      'Did you even read the question?! 🏎️',
      'Genius at work or just lucky? 🧠',
      'Speed demon in the house! 🔥'
    ];
    return fastQuotes[Math.floor(Math.random() * fastQuotes.length)];
  } else if (ratio <= 0.75) {
    const midQuotes = [
      'Locked and loaded! 🎯',
      'Fingers crossed! 🤞',
      'Calculated and cool... 🧘',
      'Great minds think alike... or do they? 🤔',
      'Hope your intuition is on point! ✨'
    ];
    return midQuotes[Math.floor(Math.random() * midQuotes.length)];
  } else {
    const lateQuotes = [
      'Taking all the time, I see... ⏳',
      'Down to the wire! Phew! ⏱️',
      'Sweating under pressure, huh? 😅',
      'Just in the nick of time! 💥',
      'Overthinking or masterminding? 🕵️'
    ];
    return lateQuotes[Math.floor(Math.random() * lateQuotes.length)];
  }
}

/**
 * Socket.io Game Engine
 */
export default function initGameSocket(io) {
  io.on('connection', (socket) => {
    // ----------------------------------------------------
    // 1. HOST: Create Room
    // ----------------------------------------------------
    socket.on('host:create_room', async ({ quizId, token }, callback) => {
      try {
        if (!token) {
          return callback?.({ error: 'Authentication token required.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qizzy_jwt_secret_key_2026_super_secure');
        if (decoded.role !== 'admin') {
          return callback?.({ error: 'Only admins/teachers can host quiz sessions.' });
        }

        // Fetch Quiz details with questions and options from DB
        const [quizRows] = await pool.execute('SELECT id, title, description, cover_image FROM quizzes WHERE id = ?', [quizId]);
        if (quizRows.length === 0) {
          return callback?.({ error: 'Quiz not found.' });
        }
        const quiz = quizRows[0];

        const [questions] = await pool.execute(
          'SELECT id, question_text, question_type, time_seconds, points, order_index FROM questions WHERE quiz_id = ? ORDER BY order_index ASC, id ASC',
          [quizId]
        );

        if (questions.length === 0) {
          return callback?.({ error: 'This quiz has no questions yet.' });
        }

        const questionIds = questions.map(q => q.id);
        const placeholders = questionIds.map(() => '?').join(',');
        const [options] = await pool.execute(
          `SELECT id, question_id, option_text, is_correct, color_shape, order_index 
           FROM options 
           WHERE question_id IN (${placeholders}) 
           ORDER BY order_index ASC, id ASC`,
          questionIds
        );

        // Group options by question
        const optionsByQ = {};
        for (const opt of options) {
          if (!optionsByQ[opt.question_id]) optionsByQ[opt.question_id] = [];
          optionsByQ[opt.question_id].push({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: Boolean(opt.is_correct),
            color_shape: opt.color_shape,
            order_index: opt.order_index
          });
        }

        const formattedQuestions = questions.map(q => ({
          ...q,
          options: optionsByQ[q.id] || []
        }));

        const pin = generatePin();

        // Create game_sessions entry in DB
        const [sessionResult] = await pool.execute(
          'INSERT INTO game_sessions (quiz_id, host_id, pin_code, status, current_question_index) VALUES (?, ?, ?, ?, ?)',
          [quizId, decoded.id, pin, 'lobby', 0]
        );
        const sessionId = sessionResult.insertId;

        // Initialize in-memory room
        const room = {
          pin,
          sessionId,
          quizId,
          hostSocketId: socket.id,
          hostId: decoded.id,
          title: quiz.title,
          status: 'lobby',
          questions: formattedQuestions,
          currentQuestionIndex: 0,
          questionStartTime: null,
          timerInterval: null,
          timeLeft: 0,
          players: new Map(), // socketId -> player object
          userToSocket: new Map(), // userId -> socketId
          answers: new Map() // questionIndex -> Map(userId -> answerData)
        };

        rooms.set(pin, room);
        socket.join(`game:${pin}`);
        socket.join(`host:${pin}`);

        // Track pin on host socket
        socket.roomPin = pin;
        socket.isHost = true;

        callback?.({
          success: true,
          pin,
          title: quiz.title,
          totalQuestions: formattedQuestions.length
        });
      } catch (error) {
        console.error('Error creating host room:', error);
        callback?.({ error: 'Failed to initialize game room.' });
      }
    });

    // ----------------------------------------------------
    // 2. PLAYER: Join Game
    // ----------------------------------------------------
    socket.on('player:join_game', async ({ pin, token, nickname }, callback) => {
      try {
        const room = rooms.get(pin);
        if (!room) {
          return callback?.({ error: 'Game room not found. Please check your PIN code.' });
        }

        if (room.status !== 'lobby') {
          return callback?.({ error: 'This quiz session has already started.' });
        }

        let userId = null;
        let playerName = (nickname || '').trim();

        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qizzy_jwt_secret_key_2026_super_secure');
            userId = decoded.id;
            if (!playerName) playerName = decoded.name;
          } catch (e) {
            // invalid token fallback
          }
        }

        if (!playerName) {
          playerName = `Player_${Math.floor(100 + Math.random() * 900)}`;
        }

        // Check if name is taken in this room
        for (const p of room.players.values()) {
          if (p.name.toLowerCase() === playerName.toLowerCase() && p.socketId !== socket.id) {
            playerName = `${playerName} (${Math.floor(10 + Math.random() * 90)})`;
            break;
          }
        }

        const playerObj = {
          socketId: socket.id,
          userId: userId || 0,
          name: playerName,
          score: 0,
          streak: 0,
          lastPoints: 0,
          lastIsCorrect: false,
          hasAnswered: false
        };

        room.players.set(socket.id, playerObj);
        if (userId) {
          room.userToSocket.set(userId, socket.id);
          // Persist in session_players
          try {
            await pool.execute(
              'INSERT INTO session_players (session_id, user_id, total_score, streak) VALUES (?, ?, 0, 0) ON DUPLICATE KEY UPDATE joined_at = CURRENT_TIMESTAMP',
              [room.sessionId, userId]
            );
          } catch (err) {
            console.error('Error recording session player:', err);
          }
        }

        socket.join(`game:${pin}`);
        socket.roomPin = pin;
        socket.isPlayer = true;

        // Broadcast updated player list to Host
        const playerList = Array.from(room.players.values()).map(p => ({
          name: p.name,
          userId: p.userId,
          score: p.score
        }));

        io.to(`host:${pin}`).emit('host:player_joined', {
          player: { name: playerObj.name, userId: playerObj.userId },
          players: playerList,
          totalPlayers: playerList.length
        });

        callback?.({
          success: true,
          pin,
          title: room.title,
          nickname: playerObj.name
        });
      } catch (error) {
        console.error('Error joining game:', error);
        callback?.({ error: 'Failed to join game room.' });
      }
    });

    // ----------------------------------------------------
    // 3. HOST: Start Game (Countdown -> Question 1)
    // ----------------------------------------------------
    socket.on('host:start_game', async ({ pin }, callback) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) {
        return callback?.({ error: 'Unauthorized to start this game.' });
      }

      if (room.players.size === 0) {
        return callback?.({ error: 'Cannot start game with 0 players in the lobby.' });
      }

      room.status = 'countdown';
      room.currentQuestionIndex = 0;

      // Update DB session status
      try {
        await pool.execute(
          'UPDATE game_sessions SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['active', room.sessionId]
        );
      } catch (e) {
        console.error('Error starting game session in DB:', e);
      }

      // 3-second Get Ready Countdown broadcast
      io.to(`game:${pin}`).emit('game:starting', {
        count: 3,
        title: room.title,
        totalQuestions: room.questions.length
      });

      callback?.({ success: true });

      // After 3 seconds, send first question
      setTimeout(() => {
        sendQuestion(io, room);
      }, 3500);
    });

    // ----------------------------------------------------
    // 4. PLAYER: Submit Answer
    // ----------------------------------------------------
    socket.on('player:submit_answer', ({ pin, optionId, responseTimeMs }, callback) => {
      const room = rooms.get(pin);
      if (!room || room.status !== 'question_active') {
        return callback?.({ error: 'Question is not active or time is up.' });
      }

      const player = room.players.get(socket.id);
      if (!player) {
        return callback?.({ error: 'Player not found in this room.' });
      }

      if (player.hasAnswered) {
        return callback?.({ error: 'Answer already submitted for this question.' });
      }

      const currentQ = room.questions[room.currentQuestionIndex];
      if (!currentQ) return;

      player.hasAnswered = true;

      // Determine correctness
      const selectedOption = currentQ.options.find(o => o.id === optionId);
      const isCorrect = selectedOption ? Boolean(selectedOption.is_correct) : false;

      // Calculate speed points: Base * (1 - responseTime / (2 * timeLimit))
      let pointsEarned = 0;
      if (isCorrect) {
        const timeLimitMs = (currentQ.time_seconds || 20) * 1000;
        const clampedResponseTime = Math.min(Math.max(responseTimeMs || 0, 50), timeLimitMs);
        const factor = 1 - (clampedResponseTime / (timeLimitMs * 2));
        pointsEarned = Math.round((currentQ.points || 1000) * factor);
        player.streak += 1;
      } else {
        player.streak = 0;
      }

      player.lastPoints = pointsEarned;
      player.lastIsCorrect = isCorrect;
      player.score += pointsEarned;

      // Store answer record
      if (!room.answers.has(room.currentQuestionIndex)) {
        room.answers.set(room.currentQuestionIndex, new Map());
      }
      room.answers.get(room.currentQuestionIndex).set(socket.id, {
        userId: player.userId,
        questionId: currentQ.id,
        optionId,
        isCorrect,
        responseTimeMs,
        pointsEarned
      });

      // Get rule-based witty quote based on timing
      const wittyQuote = getWittyQuote(responseTimeMs || 0, currentQ.time_seconds || 20);

      callback?.({
        success: true,
        isLocked: true,
        wittyQuote
      });

      // Broadcast answered count update to Host
      const answeredCount = Array.from(room.players.values()).filter(p => p.hasAnswered).length;
      const totalPlayers = room.players.size;

      io.to(`host:${pin}`).emit('host:answer_count_update', {
        answeredCount,
        totalPlayers
      });

      // Early finish if all players answered
      if (answeredCount === totalPlayers) {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }
        endQuestionTime(io, room);
      }
    });

    // ----------------------------------------------------
    // 5. HOST: Reveal Answers & Send Round Results
    // ----------------------------------------------------
    socket.on('host:reveal_answers', ({ pin }) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) return;

      room.status = 'answer_reveal';
      const currentQ = room.questions[room.currentQuestionIndex];
      if (!currentQ) return;

      const currentAnswers = room.answers.get(room.currentQuestionIndex) || new Map();

      // Compute distribution per option
      const distribution = {};
      currentQ.options.forEach(opt => {
        distribution[opt.id] = 0;
      });

      for (const ans of currentAnswers.values()) {
        if (ans.optionId && distribution[ans.optionId] !== undefined) {
          distribution[ans.optionId] += 1;
        }
      }

      const correctOption = currentQ.options.find(o => o.is_correct);

      // Compute temporary leaderboard for player rank feedback
      const sortedPlayers = Array.from(room.players.values()).sort((a, b) => b.score - a.score);

      // Send host view data
      io.to(`host:${pin}`).emit('host:show_answer_reveal', {
        questionText: currentQ.question_text,
        correctOptionId: correctOption?.id,
        options: currentQ.options,
        distribution,
        totalAnswered: currentAnswers.size
      });

      // Send personalized result to each player
      for (const [sId, p] of room.players.entries()) {
        const rank = sortedPlayers.findIndex(sp => sp.socketId === sId) + 1;
        io.to(sId).emit('player:round_result', {
          isCorrect: p.lastIsCorrect,
          pointsEarned: p.lastPoints,
          totalScore: p.score,
          streak: p.streak,
          rank,
          correctOptionText: correctOption?.option_text,
          correctColorShape: correctOption?.color_shape
        });
      }
    });

    // ----------------------------------------------------
    // 6. HOST: Show Leaderboard
    // ----------------------------------------------------
    socket.on('host:show_leaderboard', ({ pin }) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) return;

      room.status = 'leaderboard';

      const sortedPlayers = Array.from(room.players.values())
        .sort((a, b) => b.score - a.score)
        .map((p, idx) => ({
          rank: idx + 1,
          name: p.name,
          score: p.score,
          streak: p.streak,
          lastPoints: p.lastPoints
        }));

      const top5 = sortedPlayers.slice(0, 5);
      const isLastQuestion = room.currentQuestionIndex >= room.questions.length - 1;

      io.to(`game:${pin}`).emit('game:leaderboard_update', {
        leaderboard: top5,
        isLastQuestion,
        currentQuestionIndex: room.currentQuestionIndex,
        totalQuestions: room.questions.length
      });
    });

    // ----------------------------------------------------
    // 7. HOST: Next Question
    // ----------------------------------------------------
    socket.on('host:next_question', ({ pin }) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) return;

      if (room.currentQuestionIndex < room.questions.length - 1) {
        room.currentQuestionIndex += 1;
        sendQuestion(io, room);
      }
    });

    // ----------------------------------------------------
    // 8. HOST: Finish Game & Persist to MySQL
    // ----------------------------------------------------
    socket.on('host:finish_game', async ({ pin }) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) return;

      room.status = 'finished';

      const sorted = Array.from(room.players.values())
        .sort((a, b) => b.score - a.score)
        .map((p, idx) => ({
          rank: idx + 1,
          name: p.name,
          score: p.score,
          userId: p.userId
        }));

      const podium = {
        first: sorted[0] || null,
        second: sorted[1] || null,
        third: sorted[2] || null
      };

      io.to(`game:${pin}`).emit('game:final_results', {
        podium,
        standings: sorted
      });

      // Persist results into MySQL
      try {
        // 1. Update game_session
        await pool.execute(
          'UPDATE game_sessions SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['finished', room.sessionId]
        );

        // 2. Update session_players & users cumulative stats
        for (const p of room.players.values()) {
          if (p.userId) {
            // Update session_players
            await pool.execute(
              'UPDATE session_players SET total_score = ?, streak = ? WHERE session_id = ? AND user_id = ?',
              [p.score, p.streak, room.sessionId, p.userId]
            );

            // Update user overall stats: total_score, quizzes_played, avg_score
            await pool.execute(
              `UPDATE users 
               SET total_score = total_score + ?,
                   quizzes_played = quizzes_played + 1,
                   avg_score = (total_score + ?) / (quizzes_played + 1)
               WHERE id = ?`,
              [p.score, p.score, p.userId]
            );
          }
        }

        // 3. Insert player_answers logs
        for (const [qIdx, answersMap] of room.answers.entries()) {
          const qObj = room.questions[qIdx];
          if (!qObj) continue;

          for (const ans of answersMap.values()) {
            if (ans.userId) {
              await pool.execute(
                `INSERT INTO player_answers 
                 (session_id, user_id, question_id, option_id, is_correct, response_time_ms, points_earned)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  room.sessionId,
                  ans.userId,
                  ans.questionId,
                  ans.optionId || null,
                  ans.isCorrect ? 1 : 0,
                  ans.responseTimeMs || 0,
                  ans.pointsEarned || 0
                ]
              );
            }
          }
        }

        console.log(`✅ Session #${room.sessionId} (PIN ${pin}) completed & saved to MySQL!`);
      } catch (err) {
        console.error('Error saving finished game session to DB:', err);
      }
    });

    // ----------------------------------------------------
    // Disconnect
    // ----------------------------------------------------
    socket.on('disconnect', () => {
      const pin = socket.roomPin;
      if (!pin) return;

      const room = rooms.get(pin);
      if (!room) return;

      if (socket.isHost) {
        // If host disconnects during lobby, close room
        if (room.status === 'lobby') {
          io.to(`game:${pin}`).emit('game:room_closed', {
            message: 'Host has closed the quiz session.'
          });
          rooms.delete(pin);
        }
      } else if (socket.isPlayer) {
        room.players.delete(socket.id);
        const playerList = Array.from(room.players.values()).map(p => ({
          name: p.name,
          userId: p.userId,
          score: p.score
        }));

        io.to(`host:${pin}`).emit('host:player_left', {
          players: playerList,
          totalPlayers: playerList.length
        });
      }
    });
  });
}

/**
 * Send Question to Host & Players with synchronized timer
 */
function sendQuestion(io, room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }

  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ) return;

  room.status = 'question_active';
  room.questionStartTime = Date.now();
  room.timeLeft = currentQ.time_seconds || 20;

  // Reset player answered flags for this question
  for (const p of room.players.values()) {
    p.hasAnswered = false;
    p.lastPoints = 0;
    p.lastIsCorrect = false;
  }

  // Payload for Host screen (has question text + 4 colored answer boxes)
  io.to(`host:${room.pin}`).emit('game:question_start', {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    questionText: currentQ.question_text,
    questionType: currentQ.question_type,
    timeSeconds: currentQ.time_seconds || 20,
    points: currentQ.points || 1000,
    options: currentQ.options.map(opt => ({
      id: opt.id,
      option_text: opt.option_text,
      color_shape: opt.color_shape
    })),
    totalPlayers: room.players.size
  });

  // Payload for Player screen (colored buttons)
  for (const [sId, p] of room.players.entries()) {
    io.to(sId).emit('player:question_start', {
      questionIndex: room.currentQuestionIndex,
      totalQuestions: room.questions.length,
      questionType: currentQ.question_type,
      timeSeconds: currentQ.time_seconds || 20,
      points: currentQ.points || 1000,
      options: currentQ.options.map(opt => ({
        id: opt.id,
        color_shape: opt.color_shape
      }))
    });
  }

  // Authoritative server-side 1-second interval timer
  room.timerInterval = setInterval(() => {
    room.timeLeft -= 1;

    io.to(`game:${room.pin}`).emit('game:timer_tick', {
      timeLeft: Math.max(0, room.timeLeft)
    });

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      endQuestionTime(io, room);
    }
  }, 1000);
}

/**
 * Handle question timeout
 */
function endQuestionTime(io, room) {
  room.status = 'answer_reveal';
  io.to(`game:${room.pin}`).emit('game:question_time_up');
}
