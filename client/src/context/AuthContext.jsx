import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.port !== '5173' ? '/api' : 'http://localhost:5000/api');

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      localStorage.removeItem('qizzy_token');
      return sessionStorage.getItem('qizzy_token') || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(sessionStorage.getItem('qizzy_token')));

  // Load user profile on app start if token exists
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadUser() {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (isMounted) setUser(data.user);
        } else {
          // Token invalid or expired
          if (isMounted) logout();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to load user session:', error);
        if (isMounted) logout();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUser();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token]);

  // Login handler
  async function login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    sessionStorage.setItem('qizzy_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  // Register handler
  async function register(formData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed.');
    }

    sessionStorage.setItem('qizzy_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  // Logout handler
  function logout() {
    sessionStorage.removeItem('qizzy_token');
    localStorage.removeItem('qizzy_token');
    setToken(null);
    setUser(null);
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
