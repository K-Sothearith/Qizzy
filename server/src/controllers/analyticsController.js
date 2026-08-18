import { query } from '../config/db.js';

/**
 * @route   GET /api/analytics/student
 * @desc    Get aggregated analytics, performance stats, and session history for the logged-in student
 * @access  Private (Student/User)
 */
export async function getStudentAnalytics(req, res) {
  try {
    const userId = req.user.id;

    // 1. Fetch user record
    const userRows = await query(
      'SELECT id, name, email, role, total_score, avg_score, quizzes_played, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userRows[0];
    const totalScore = user.total_score || 0;
    const avgScore = parseFloat(user.avg_score) || 0;
    const quizzesPlayed = user.quizzes_played || 0;

    // 2. Global Leaderboard Ranking
    const rankResult = await query(
      `SELECT COUNT(*) + 1 AS global_rank 
       FROM users 
       WHERE role = 'student' 
         AND (total_score > ? OR (total_score = ? AND id < ?))`,
      [totalScore, totalScore, userId]
    );
    const globalRank = rankResult[0]?.global_rank || 1;

    // Total count of students
    const totalStudentsResult = await query(
      `SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'`
    );
    const totalStudents = totalStudentsResult[0]?.total_students || 1;

    // 3. Overall question-level stats (accuracy, total questions answered, highest score)
    const answerStatsResult = await query(
      `SELECT 
         COUNT(*) AS total_answers,
         SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS total_correct,
         AVG(response_time_ms) AS avg_response_time_ms
       FROM player_answers 
       WHERE user_id = ?`,
      [userId]
    );

    const totalAnswers = answerStatsResult[0]?.total_answers || 0;
    const totalCorrect = Number(answerStatsResult[0]?.total_correct) || 0;
    const avgResponseTimeMs = Math.round(parseFloat(answerStatsResult[0]?.avg_response_time_ms) || 0);
    const accuracyRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    // Best single game score
    const bestGameResult = await query(
      `SELECT MAX(total_score) AS highest_game_score FROM session_players WHERE user_id = ?`,
      [userId]
    );
    const highestGameScore = bestGameResult[0]?.highest_game_score || 0;

    // 4. Session History List (Past Quizzes)
    const historyRows = await query(
      `SELECT 
        sp.session_id,
        sp.total_score AS student_score,
        sp.streak AS student_streak,
        sp.joined_at,
        gs.pin_code,
        gs.status AS session_status,
        gs.created_at AS session_date,
        gs.ended_at AS session_ended_at,
        q.id AS quiz_id,
        q.title AS quiz_title,
        q.cover_image AS quiz_cover,
        u_host.name AS host_name,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) AS total_questions,
        (SELECT COUNT(*) FROM player_answers pa WHERE pa.session_id = sp.session_id AND pa.user_id = sp.user_id AND pa.is_correct = 1) AS correct_count,
        (SELECT COUNT(*) FROM player_answers pa WHERE pa.session_id = sp.session_id AND pa.user_id = sp.user_id) AS answered_count,
        (
          SELECT COUNT(*) + 1 
          FROM session_players sp2 
          WHERE sp2.session_id = sp.session_id 
            AND (sp2.total_score > sp.total_score OR (sp2.total_score = sp.total_score AND sp2.id < sp.id))
        ) AS session_rank,
        (SELECT COUNT(*) FROM session_players sp3 WHERE sp3.session_id = sp.session_id) AS total_session_players
      FROM session_players sp
      JOIN game_sessions gs ON sp.session_id = gs.id
      JOIN quizzes q ON gs.quiz_id = q.id
      JOIN users u_host ON gs.host_id = u_host.id
      WHERE sp.user_id = ?
      ORDER BY gs.created_at DESC
      LIMIT 50`,
      [userId]
    );

    const history = historyRows.map(row => ({
      sessionId: row.session_id,
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      quizCover: row.quiz_cover,
      hostName: row.host_name,
      pinCode: row.pin_code,
      sessionStatus: row.session_status,
      date: row.session_date,
      endedAt: row.session_ended_at,
      score: row.student_score,
      streak: row.student_streak,
      rank: row.session_rank,
      totalPlayers: row.total_session_players,
      totalQuestions: row.total_questions || 0,
      correctCount: row.correct_count || 0,
      answeredCount: row.answered_count || 0,
      accuracy: row.answered_count > 0 ? Math.round((row.correct_count / row.answered_count) * 100) : 0
    }));

    return res.json({
      success: true,
      stats: {
        totalScore,
        avgScore,
        quizzesPlayed,
        globalRank,
        totalStudents,
        totalAnswers,
        totalCorrect,
        accuracyRate,
        avgResponseTimeMs,
        highestGameScore
      },
      history
    });
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    return res.status(500).json({
      message: 'Server error fetching student analytics.',
      error: error.message
    });
  }
}

/**
 * @route   GET /api/analytics/session/:sessionId
 * @desc    Get detailed breakdown of player answers for a past game session
 * @access  Private (Student/User)
 */
export async function getSessionDetails(req, res) {
  try {
    const userId = req.user.id;
    const sessionId = parseInt(req.params.sessionId, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({ message: 'Invalid session ID.' });
    }

    const answers = await query(
      `SELECT 
        pa.id,
        pa.question_id,
        pa.option_id,
        pa.is_correct,
        pa.response_time_ms,
        pa.points_earned,
        q.question_text,
        q.question_type,
        q.time_seconds,
        q.points AS max_points,
        q.order_index,
        opt.option_text AS selected_option_text,
        opt.color_shape AS selected_color_shape,
        (
          SELECT opt_c.option_text 
          FROM options opt_c 
          WHERE opt_c.question_id = q.id AND opt_c.is_correct = 1 
          LIMIT 1
        ) AS correct_option_text
      FROM player_answers pa
      JOIN questions q ON pa.question_id = q.id
      LEFT JOIN options opt ON pa.option_id = opt.id
      WHERE pa.session_id = ? AND pa.user_id = ?
      ORDER BY q.order_index ASC, q.id ASC`,
      [sessionId, userId]
    );

    return res.json({
      success: true,
      sessionId,
      answers: answers.map(a => ({
        id: a.id,
        questionId: a.question_id,
        questionText: a.question_text,
        questionType: a.question_type,
        timeSeconds: a.time_seconds,
        maxPoints: a.max_points,
        isCorrect: Boolean(a.is_correct),
        responseTimeMs: a.response_time_ms,
        pointsEarned: a.points_earned,
        selectedOption: a.selected_option_text || '(No Answer / Timed Out)',
        selectedColorShape: a.selected_color_shape,
        correctOption: a.correct_option_text
      }))
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    return res.status(500).json({
      message: 'Server error fetching session details.',
      error: error.message
    });
  }
}

/**
 * @route   GET /api/analytics/host-history
 * @desc    Get the 5 most recent hosted quiz sessions with participant leaderboards for the host/teacher
 * @access  Private (Admin / Host)
 */
export async function getHostHistory(req, res) {
  try {
    const hostId = req.user.id;

    // 1. Auto-prune sessions beyond 5 for this host
    const allSessions = await query(
      'SELECT id FROM game_sessions WHERE host_id = ? ORDER BY created_at DESC',
      [hostId]
    );

    if (allSessions.length > 5) {
      const idsToDelete = allSessions.slice(5).map(s => s.id);
      const placeholders = idsToDelete.map(() => '?').join(',');
      await query(`DELETE FROM game_sessions WHERE id IN (${placeholders})`, idsToDelete);
    }

    // 2. Fetch the 5 most recent game sessions
    const sessions = await query(
      `SELECT 
        gs.id AS session_id,
        gs.pin_code,
        gs.status,
        gs.created_at,
        gs.started_at,
        gs.ended_at,
        q.id AS quiz_id,
        q.title AS quiz_title,
        q.cover_image AS quiz_cover,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) AS total_questions,
        (SELECT COUNT(*) FROM session_players WHERE session_id = gs.id) AS total_players
      FROM game_sessions gs
      JOIN quizzes q ON gs.quiz_id = q.id
      WHERE gs.host_id = ?
      ORDER BY gs.created_at DESC
      LIMIT 5`,
      [hostId]
    );

    // 3. For each session, fetch the ranked leaderboard
    const history = await Promise.all(
      sessions.map(async (sess) => {
        const players = await query(
          `SELECT 
            sp.user_id,
            sp.total_score,
            sp.streak,
            u.name AS real_name,
            SUBSTRING_INDEX(u.email, '@', 1) AS username
          FROM session_players sp
          JOIN users u ON sp.user_id = u.id
          WHERE sp.session_id = ?
          ORDER BY sp.total_score DESC, sp.id ASC`,
          [sess.session_id]
        );

        const rankedPlayers = players.map((p, idx) => ({
          rank: idx + 1,
          userId: p.user_id,
          realName: p.real_name,
          username: p.username,
          score: p.total_score,
          streak: p.streak
        }));

        return {
          sessionId: sess.session_id,
          pinCode: sess.pin_code,
          status: sess.status,
          date: sess.started_at || sess.created_at,
          endedAt: sess.ended_at,
          quizId: sess.quiz_id,
          quizTitle: sess.quiz_title,
          quizCover: sess.quiz_cover,
          totalQuestions: sess.total_questions || 0,
          totalPlayers: sess.total_players || rankedPlayers.length,
          top5: rankedPlayers.slice(0, 5),
          allPlayers: rankedPlayers
        };
      })
    );

    return res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching host quiz history:', error);
    return res.status(500).json({
      message: 'Server error fetching host history.',
      error: error.message
    });
  }
}

