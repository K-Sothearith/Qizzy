const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port !== '5173' ? '/api' : 'http://localhost:5000/api');

/**
 * Fetch overall student statistics and history of past sessions
 */
export async function fetchStudentAnalytics(token) {
  const response = await fetch(`${API_BASE_URL}/analytics/student`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch student analytics');
  }

  return data;
}

/**
 * Fetch detailed question-by-question breakdown for a completed game session
 */
export async function fetchSessionDetails(sessionId, token) {
  const response = await fetch(`${API_BASE_URL}/analytics/session/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch session details');
  }

  return data;
}

/**
 * Fetch host quiz history with leaderboards for the last 5 sessions
 */
export async function fetchHostHistory(token) {
  const response = await fetch(`${API_BASE_URL}/analytics/host-history`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch host history');
  }

  return data;
}
