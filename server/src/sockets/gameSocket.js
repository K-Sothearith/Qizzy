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

// Preset teams for cooperative group mode
const TEAM_PRESETS = [
  { id: 'team_red', name: 'Crimson Dragons', icon: '🐉', color: '#ff4757', bg: 'linear-gradient(135deg, #ff4757 0%, #c0392b 100%)' },
  { id: 'team_blue', name: 'Cobalt Titans', icon: '⚡', color: '#1e90ff', bg: 'linear-gradient(135deg, #1e90ff 0%, #0984e3 100%)' },
  { id: 'team_yellow', name: 'Golden Hawks', icon: '🦅', color: '#ffa502', bg: 'linear-gradient(135deg, #ffa502 0%, #e67e22 100%)' },
  { id: 'team_green', name: 'Emerald Wolves', icon: '🐺', color: '#2ed573', bg: 'linear-gradient(135deg, #2ed573 0%, #20bf6b 100%)' }
];

function getActiveTeams(teamCount = 2) {
  const count = Math.max(2, Math.min(4, Number(teamCount) || 2));
  return TEAM_PRESETS.slice(0, count);
}

function assignPlayerToTeam(room, socketId) {
  if (room.gameMode !== 'team') return null;
  const activeTeams = getActiveTeams(room.teamCount);
  
  const counts = {};
  activeTeams.forEach(t => { counts[t.id] = 0; });
  for (const [sId, p] of room.players.entries()) {
    if (sId !== socketId && p.teamId && counts[p.teamId] !== undefined) {
      counts[p.teamId]++;
    }
  }

  let minTeam = activeTeams[0];
  let minCount = Infinity;
  for (const t of activeTeams) {
    if (counts[t.id] < minCount) {
      minCount = counts[t.id];
      minTeam = t;
    }
  }
  return minTeam;
}

function rebalanceAllTeams(room) {
  if (room.gameMode !== 'team') return;
  const activeTeams = getActiveTeams(room.teamCount);
  const playerSockets = Array.from(room.players.keys());
  
  playerSockets.forEach((sId, index) => {
    const team = activeTeams[index % activeTeams.length];
    const player = room.players.get(sId);
    if (player) {
      player.teamId = team.id;
      player.team = team;
    }
  });
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
          gameMode: 'individual', // 'individual' | 'team'
          teamCount: 2, // 2, 3, or 4 teams
          teams: getActiveTeams(2),
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
          totalQuestions: formattedQuestions.length,
          gameMode: room.gameMode,
          teamCount: room.teamCount,
          teams: room.teams
        });
      } catch (error) {
        console.error('Error creating host room:', error);
        callback?.({ error: 'Failed to initialize game room.' });
      }
    });

    // ----------------------------------------------------
    // 2. PLAYER: Join Game
    // ----------------------------------------------------
    socket.on('player:join_game', async ({ pin, token, nickname, avatar }, callback) => {
      try {
        const room = rooms.get(pin);
        if (!room) {
          return callback?.({ error: 'Game room not found. Please check your PIN code.' });
        }

        if (room.status === 'finished') {
          return callback?.({ error: 'This quiz session has already finished.' });
        }

        const isMidGame = room.status !== 'lobby';

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

        const playerAvatar = typeof avatar === 'object' && avatar?.emoji 
          ? avatar 
          : { emoji: (typeof avatar === 'string' && avatar ? avatar : '🦊'), color: 'sand' };

        let assignedTeam = null;
        if (room.gameMode === 'team') {
          assignedTeam = assignPlayerToTeam(room, socket.id);
        }

        const playerObj = {
          socketId: socket.id,
          userId: userId || 0,
          name: playerName,
          avatar: playerAvatar,
          teamId: assignedTeam?.id || null,
          team: assignedTeam || null,
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

        // Broadcast updated player list and count to Host
        const playerList = Array.from(room.players.values()).map(p => ({
          name: p.name,
          userId: p.userId,
          avatar: p.avatar,
          teamId: p.teamId,
          team: p.team,
          score: p.score
        }));

        io.to(`host:${pin}`).emit('host:player_joined', {
          player: { 
            name: playerObj.name, 
            userId: playerObj.userId, 
            avatar: playerObj.avatar,
            teamId: playerObj.teamId,
            team: playerObj.team
          },
          players: playerList,
          totalPlayers: playerList.length,
          isMidGame
        });

        // If joined during active question, also update host live answering count
        if (room.status === 'question_active') {
          const answeredCount = Array.from(room.players.values()).filter(p => p.hasAnswered).length;
          io.to(`host:${pin}`).emit('host:answer_count_update', {
            answeredCount,
            totalPlayers: room.players.size
          });
        }

        let activeQuestion = null;
        if (room.status === 'question_active' && room.questions[room.currentQuestionIndex]) {
          const currentQ = room.questions[room.currentQuestionIndex];
          activeQuestion = {
            questionIndex: room.currentQuestionIndex,
            totalQuestions: room.questions.length,
            questionText: currentQ.question_text,
            questionType: currentQ.question_type,
            timeSeconds: currentQ.time_seconds || 20,
            timeLeft: Math.max(0, room.timeLeft),
            points: currentQ.points || 1000,
            options: currentQ.options.map(opt => ({
              id: opt.id,
              option_text: opt.option_text,
              color_shape: opt.color_shape
            }))
          };
        }

        callback?.({
          success: true,
          pin,
          title: room.title,
          nickname: playerObj.name,
          avatar: playerObj.avatar,
          gameMode: room.gameMode,
          teamId: playerObj.teamId,
          team: playerObj.team,
          teams: getActiveTeams(room.teamCount),
          isMidGame,
          gameStatus: room.status,
          currentQuestionIndex: room.currentQuestionIndex,
          totalQuestions: room.questions.length,
          activeQuestion
        });
      } catch (error) {
        console.error('Error joining game:', error);
        callback?.({ error: 'Failed to join game room.' });
      }
    });

    // ----------------------------------------------------
    // 2B. HOST: Change Game Mode (Individual vs Team)
    // ----------------------------------------------------
    socket.on('host:set_game_mode', ({ pin, gameMode, teamCount }, callback) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) return;
      if (room.status !== 'lobby') {
        return callback?.({ error: 'Cannot change game mode after quiz has started.' });
      }

      room.gameMode = gameMode === 'team' ? 'team' : 'individual';
      room.teamCount = Math.max(2, Math.min(4, Number(teamCount) || 2));
      room.teams = getActiveTeams(room.teamCount);

      if (room.gameMode === 'team') {
        rebalanceAllTeams(room);
      } else {
        for (const p of room.players.values()) {
          p.teamId = null;
          p.team = null;
        }
      }

      const playerList = Array.from(room.players.values()).map(p => ({
        name: p.name,
        userId: p.userId,
        avatar: p.avatar,
        teamId: p.teamId,
        team: p.team,
        score: p.score
      }));

      // Broadcast update to host
      io.to(`host:${pin}`).emit('host:game_mode_changed', {
        gameMode: room.gameMode,
        teamCount: room.teamCount,
        teams: room.teams,
        players: playerList
      });

      // Notify all connected players of updated mode & team assignment
      for (const [sId, p] of room.players.entries()) {
        io.to(sId).emit('player:team_assigned', {
          gameMode: room.gameMode,
          team: p.team,
          teams: room.teams
        });
      }

      callback?.({
        success: true,
        gameMode: room.gameMode,
        teamCount: room.teamCount,
        teams: room.teams,
        players: playerList
      });
    });

    // ----------------------------------------------------
    // 2C. HOST: Shuffle Teams
    // ----------------------------------------------------
    socket.on('host:shuffle_teams', ({ pin }, callback) => {
      const room = rooms.get(pin);
      if (!room || room.hostSocketId !== socket.id) return;
      if (room.status !== 'lobby' || room.gameMode !== 'team') return;

      const activeTeams = getActiveTeams(room.teamCount);
      const playerSockets = Array.from(room.players.keys()).sort(() => Math.random() - 0.5);

      playerSockets.forEach((sId, idx) => {
        const team = activeTeams[idx % activeTeams.length];
        const p = room.players.get(sId);
        if (p) {
          p.teamId = team.id;
          p.team = team;
        }
      });

      const playerList = Array.from(room.players.values()).map(p => ({
        name: p.name,
        userId: p.userId,
        avatar: p.avatar,
        teamId: p.teamId,
        team: p.team,
        score: p.score
      }));

      io.to(`host:${pin}`).emit('host:teams_shuffled', {
        teams: activeTeams,
        players: playerList
      });

      for (const [sId, p] of room.players.entries()) {
        io.to(sId).emit('player:team_assigned', {
          gameMode: room.gameMode,
          team: p.team,
          teams: activeTeams
        });
      }

      callback?.({ success: true, players: playerList });
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
        totalQuestions: room.questions.length,
        gameMode: room.gameMode,
        teams: room.teams
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
        return callback?.({ error: 'You have already answered this question.' });
      }

      const currentQ = room.questions[room.currentQuestionIndex];
      if (!currentQ) {
        return callback?.({ error: 'Question data missing.' });
      }

      const chosenOption = currentQ.options.find(opt => opt.id === optionId);
      const isCorrect = Boolean(chosenOption?.is_correct);

      // Score Calculation Formula
      let pointsEarned = 0;
      if (isCorrect) {
        const timeLimitMs = (currentQ.time_seconds || 20) * 1000;
        const validResponseTime = Math.min(Math.max(0, responseTimeMs || 0), timeLimitMs);
        const timeFactor = 1 - (validResponseTime / (2 * timeLimitMs));
        pointsEarned = Math.round((currentQ.points || 1000) * timeFactor);

        player.streak += 1;
        player.score += pointsEarned;
        player.lastPoints = pointsEarned;
        player.lastIsCorrect = true;
      } else {
        player.streak = 0;
        player.lastPoints = 0;
        player.lastIsCorrect = false;
      }

      player.hasAnswered = true;

      // Record answer in room memory
      if (!room.answers.has(room.currentQuestionIndex)) {
        room.answers.set(room.currentQuestionIndex, new Map());
      }
      const answersMap = room.answers.get(room.currentQuestionIndex);
      answersMap.set(socket.id, {
        socketId: socket.id,
        userId: player.userId,
        questionId: currentQ.id,
        optionId,
        isCorrect,
        responseTimeMs: responseTimeMs || 0,
        pointsEarned
      });

      const answeredCount = Array.from(room.players.values()).filter(p => p.hasAnswered).length;
      const totalPlayers = room.players.size;

      io.to(`host:${pin}`).emit('host:answer_count_update', {
        answeredCount,
        totalPlayers
      });

      // Early finish if all players answered
      if (answeredCount === totalPlayers && totalPlayers > 0) {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }
        endQuestionTime(io, room);
      }

      const wittyQuote = getWittyQuote(responseTimeMs || 0, currentQ.time_seconds || 20);

      callback?.({
        success: true,
        isCorrect,
        pointsEarned,
        totalScore: player.score,
        streak: player.streak,
        wittyQuote
      });
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
          team: p.team,
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
          avatar: p.avatar,
          team: p.team,
          lastPoints: p.lastPoints
        }));

      const top5 = sortedPlayers.slice(0, 5);
      const isLastQuestion = room.currentQuestionIndex >= room.questions.length - 1;

      // If team mode, compute team standings
      let teamsLeaderboard = null;
      if (room.gameMode === 'team') {
        const activeTeams = getActiveTeams(room.teamCount);
        teamsLeaderboard = activeTeams.map(t => {
          const members = Array.from(room.players.values()).filter(p => p.teamId === t.id);
          const totalScore = members.reduce((sum, m) => sum + m.score, 0);
          const avgScore = members.length > 0 ? Math.round(totalScore / members.length) : 0;
          const sortedMembers = members.sort((a, b) => b.score - a.score);
          const mvp = sortedMembers[0] || null;

          return {
            ...t,
            totalScore,
            avgScore,
            memberCount: members.length,
            members: sortedMembers.map(m => ({ name: m.name, score: m.score, avatar: m.avatar })),
            mvp: mvp ? { name: mvp.name, score: mvp.score, avatar: mvp.avatar } : null
          };
        }).sort((a, b) => b.totalScore - a.totalScore);
      }

      io.to(`game:${pin}`).emit('game:leaderboard_update', {
        leaderboard: top5,
        gameMode: room.gameMode,
        teamsLeaderboard,
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
          avatar: p.avatar,
          team: p.team,
          userId: p.userId
        }));

      const podium = {
        first: sorted[0] || null,
        second: sorted[1] || null,
        third: sorted[2] || null
      };

      // Compute Team Podium if Team Mode
      let teamPodium = null;
      if (room.gameMode === 'team') {
        const activeTeams = getActiveTeams(room.teamCount);
        const sortedTeams = activeTeams.map(t => {
          const members = Array.from(room.players.values()).filter(p => p.teamId === t.id);
          const totalScore = members.reduce((sum, m) => sum + m.score, 0);
          const avgScore = members.length > 0 ? Math.round(totalScore / members.length) : 0;
          const sortedMembers = members.sort((a, b) => b.score - a.score);
          return {
            ...t,
            totalScore,
            avgScore,
            memberCount: members.length,
            members: sortedMembers.map(m => ({ name: m.name, score: m.score, avatar: m.avatar })),
            mvp: sortedMembers[0] ? { name: sortedMembers[0].name, score: sortedMembers[0].score, avatar: sortedMembers[0].avatar } : null
          };
        }).sort((a, b) => b.totalScore - a.totalScore);

        teamPodium = {
          first: sortedTeams[0] || null,
          second: sortedTeams[1] || null,
          third: sortedTeams[2] || null,
          allTeams: sortedTeams
        };
      }

      io.to(`game:${pin}`).emit('game:final_results', {
        gameMode: room.gameMode,
        podium,
        teamPodium,
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
          avatar: p.avatar,
          teamId: p.teamId,
          team: p.team,
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

  // Payload for Player screen (with full question prompt, timer, and option texts)
  for (const [sId, p] of room.players.entries()) {
    io.to(sId).emit('player:question_start', {
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
