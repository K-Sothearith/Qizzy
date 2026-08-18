const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port !== '5173' ? '/api' : 'http://localhost:5000/api');

/**
 * Fetch all quizzes created by the logged-in admin
 */
export async function fetchAdminQuizzes(token) {
  const response = await fetch(`${API_BASE_URL}/quizzes`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch quizzes');
  }

  return data.quizzes;
}

/**
 * Fetch single quiz with nested questions and options
 */
export async function fetchQuizById(quizId, token) {
  const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch quiz details');
  }

  return data.quiz;
}

/**
 * Create a new quiz
 */
export async function createQuiz(quizData, token) {
  const response = await fetch(`${API_BASE_URL}/quizzes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(quizData)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create quiz');
  }

  return data;
}

/**
 * Update an existing quiz
 */
export async function updateQuiz(quizId, quizData, token) {
  const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(quizData)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update quiz');
  }

  return data;
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId, token) {
  const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete quiz');
  }

  return data;
}
