import { pool } from '../config/db.js';

/**
 * Get all quizzes created by the current admin
 * GET /api/quizzes
 */
export async function getQuizzes(req, res) {
  try {
    const adminId = req.user.id;

    // Fetch quizzes along with question counts and total potential points
    const sql = `
      SELECT 
        q.id,
        q.admin_id,
        q.title,
        q.description,
        q.cover_image,
        q.created_at,
        q.updated_at,
        COUNT(DISTINCT quest.id) AS question_count,
        COALESCE(SUM(quest.points), 0) AS total_points,
        COALESCE(SUM(quest.time_seconds), 0) AS total_duration_seconds
      FROM quizzes q
      LEFT JOIN questions quest ON q.id = quest.quiz_id
      WHERE q.admin_id = ?
      GROUP BY q.id
      ORDER BY q.updated_at DESC, q.created_at DESC
    `;

    const [quizzes] = await pool.execute(sql, [adminId]);

    return res.status(200).json({
      success: true,
      quizzes
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return res.status(500).json({
      message: 'Failed to fetch quizzes. Please try again later.'
    });
  }
}

/**
 * Get a single quiz with nested questions and options
 * GET /api/quizzes/:id
 */
export async function getQuizById(req, res) {
  try {
    const adminId = req.user.id;
    const quizId = parseInt(req.params.id, 10);

    if (isNaN(quizId)) {
      return res.status(400).json({ message: 'Invalid quiz ID provided.' });
    }

    // 1. Fetch Quiz metadata
    const [quizRows] = await pool.execute(
      'SELECT id, admin_id, title, description, cover_image, created_at, updated_at FROM quizzes WHERE id = ?',
      [quizId]
    );

    if (quizRows.length === 0) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const quiz = quizRows[0];

    // Ensure the requester owns this quiz (or is admin)
    if (quiz.admin_id !== adminId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied to this quiz.' });
    }

    // 2. Fetch Questions
    const [questionRows] = await pool.execute(
      'SELECT id, quiz_id, question_text, question_type, time_seconds, points, order_index FROM questions WHERE quiz_id = ? ORDER BY order_index ASC, id ASC',
      [quizId]
    );

    // 3. If there are questions, fetch their options
    let questions = [];
    if (questionRows.length > 0) {
      const questionIds = questionRows.map(q => q.id);
      const placeholders = questionIds.map(() => '?').join(',');
      
      const [optionRows] = await pool.execute(
        `SELECT id, question_id, option_text, is_correct, color_shape, order_index 
         FROM options 
         WHERE question_id IN (${placeholders}) 
         ORDER BY order_index ASC, id ASC`,
        questionIds
      );

      // Group options by question_id
      const optionsByQuestion = {};
      for (const opt of optionRows) {
        if (!optionsByQuestion[opt.question_id]) {
          optionsByQuestion[opt.question_id] = [];
        }
        optionsByQuestion[opt.question_id].push({
          id: opt.id,
          option_text: opt.option_text,
          is_correct: Boolean(opt.is_correct),
          color_shape: opt.color_shape,
          order_index: opt.order_index
        });
      }

      questions = questionRows.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        time_seconds: q.time_seconds,
        points: q.points,
        order_index: q.order_index,
        options: optionsByQuestion[q.id] || []
      }));
    }

    return res.status(200).json({
      success: true,
      quiz: {
        ...quiz,
        questions
      }
    });
  } catch (error) {
    console.error('Error fetching quiz by ID:', error);
    return res.status(500).json({
      message: 'Failed to fetch quiz details. Please try again.'
    });
  }
}

/**
 * Create a new quiz with nested questions and options
 * POST /api/quizzes
 */
export async function createQuiz(req, res) {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const { title, description = '', cover_image = '', questions = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Quiz title is required.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Quiz must contain at least one question.' });
    }

    // Validate questions and options structure
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text || !q.question_text.trim()) {
        return res.status(400).json({ message: `Question #${i + 1} is missing question text.` });
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ message: `Question #${i + 1} must have at least 2 options.` });
      }

      const hasCorrect = q.options.some(opt => Boolean(opt.is_correct));
      if (!hasCorrect) {
        return res.status(400).json({ message: `Question #${i + 1} must have at least one correct option selected.` });
      }

      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        if (!opt.option_text || !opt.option_text.trim()) {
          return res.status(400).json({ message: `Option #${j + 1} in Question #${i + 1} cannot be empty.` });
        }
      }
    }

    // Start MySQL Transaction
    await connection.beginTransaction();

    // 1. Insert Quiz
    const [quizResult] = await connection.execute(
      'INSERT INTO quizzes (admin_id, title, description, cover_image) VALUES (?, ?, ?, ?)',
      [adminId, title.trim(), description ? description.trim() : null, cover_image ? cover_image.trim() : null]
    );
    const quizId = quizResult.insertId;

    // 2. Insert Questions & Options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qType = q.question_type === 'true_false' ? 'true_false' : 'multiple_choice';
      const timeSec = q.time_seconds ? parseInt(q.time_seconds, 10) : 20;
      const pts = q.points !== undefined ? parseInt(q.points, 10) : 1000;
      const orderIdx = i + 1;

      const [qResult] = await connection.execute(
        'INSERT INTO questions (quiz_id, question_text, question_type, time_seconds, points, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [quizId, q.question_text.trim(), qType, timeSec, pts, orderIdx]
      );
      const questionId = qResult.insertId;

      // Insert Options
      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        const colorShape = opt.color_shape || ['red_triangle', 'blue_diamond', 'yellow_circle', 'green_square'][j % 4];
        const isCorrect = Boolean(opt.is_correct);

        await connection.execute(
          'INSERT INTO options (question_id, option_text, is_correct, color_shape, order_index) VALUES (?, ?, ?, ?, ?)',
          [questionId, opt.option_text.trim(), isCorrect, colorShape, j + 1]
        );
      }
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully! 🎉',
      quizId
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      // ignore rollback error if connection is closed
    }
    console.error('Error creating quiz:', error);
    return res.status(500).json({
      message: 'Failed to create quiz due to a server error.'
    });
  } finally {
    try {
      connection.release();
    } catch (relErr) {
      // ignore
    }
  }
}

/**
 * Update an existing quiz with questions and options
 * PUT /api/quizzes/:id
 */
export async function updateQuiz(req, res) {
  const connection = await pool.getConnection();
  try {
    const adminId = req.user.id;
    const quizId = parseInt(req.params.id, 10);
    const { title, description = '', cover_image = '', questions = [] } = req.body;

    if (isNaN(quizId)) {
      return res.status(400).json({ message: 'Invalid quiz ID provided.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Quiz title is required.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Quiz must contain at least one question.' });
    }

    // Verify ownership
    const [existing] = await pool.execute('SELECT id, admin_id FROM quizzes WHERE id = ?', [quizId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }
    if (existing[0].admin_id !== adminId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to update this quiz.' });
    }

    // Validate questions and options structure
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text || !q.question_text.trim()) {
        return res.status(400).json({ message: `Question #${i + 1} is missing question text.` });
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ message: `Question #${i + 1} must have at least 2 options.` });
      }

      const hasCorrect = q.options.some(opt => Boolean(opt.is_correct));
      if (!hasCorrect) {
        return res.status(400).json({ message: `Question #${i + 1} must have at least one correct option selected.` });
      }

      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        if (!opt.option_text || !opt.option_text.trim()) {
          return res.status(400).json({ message: `Option #${j + 1} in Question #${i + 1} cannot be empty.` });
        }
      }
    }

    // Start Transaction
    await connection.beginTransaction();

    // 1. Update Quiz Meta
    await connection.execute(
      'UPDATE quizzes SET title = ?, description = ?, cover_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title.trim(), description ? description.trim() : null, cover_image ? cover_image.trim() : null, quizId]
    );

    // 2. Delete old questions (Cascade will delete options automatically)
    await connection.execute('DELETE FROM questions WHERE quiz_id = ?', [quizId]);

    // 3. Re-insert questions and options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qType = q.question_type === 'true_false' ? 'true_false' : 'multiple_choice';
      const timeSec = q.time_seconds ? parseInt(q.time_seconds, 10) : 20;
      const pts = q.points !== undefined ? parseInt(q.points, 10) : 1000;
      const orderIdx = i + 1;

      const [qResult] = await connection.execute(
        'INSERT INTO questions (quiz_id, question_text, question_type, time_seconds, points, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [quizId, q.question_text.trim(), qType, timeSec, pts, orderIdx]
      );
      const questionId = qResult.insertId;

      // Insert Options
      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        const colorShape = opt.color_shape || ['red_triangle', 'blue_diamond', 'yellow_circle', 'green_square'][j % 4];
        const isCorrect = Boolean(opt.is_correct);

        await connection.execute(
          'INSERT INTO options (question_id, option_text, is_correct, color_shape, order_index) VALUES (?, ?, ?, ?, ?)',
          [questionId, opt.option_text.trim(), isCorrect, colorShape, j + 1]
        );
      }
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Quiz updated successfully! 🚀',
      quizId
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      // ignore
    }
    console.error('Error updating quiz:', error);
    return res.status(500).json({
      message: 'Failed to update quiz due to a server error.'
    });
  } finally {
    try {
      connection.release();
    } catch (relErr) {
      // ignore
    }
  }
}

/**
 * Delete a quiz
 * DELETE /api/quizzes/:id
 */
export async function deleteQuiz(req, res) {
  try {
    const adminId = req.user.id;
    const quizId = parseInt(req.params.id, 10);

    if (isNaN(quizId)) {
      return res.status(400).json({ message: 'Invalid quiz ID provided.' });
    }

    // Check quiz existence and ownership
    const [existing] = await pool.execute('SELECT id, admin_id FROM quizzes WHERE id = ?', [quizId]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    if (existing[0].admin_id !== adminId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to delete this quiz.' });
    }

    // Delete quiz (Foreign keys in MySQL will cascade delete questions & options)
    await pool.execute('DELETE FROM quizzes WHERE id = ?', [quizId]);

    return res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return res.status(500).json({
      message: 'Failed to delete quiz. Please try again.'
    });
  }
}
