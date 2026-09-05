import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('civic_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('civic_token') || null);
  const [loading, setLoading] = useState(true);

  // Authenticated fetch wrapper that automatically attaches Authorization header
  const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  };

  // Validate session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          localStorage.setItem('civic_user', JSON.stringify(user));
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.warn('Session verification network error, keeping cached session:', err);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  // Login handler
  const login = async ({ phone_or_email, password, otp, expected_role }) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_or_email,
        password: password || undefined,
        otp: otp || undefined,
        expected_role: expected_role || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data?.detail || data?.error?.message || 'Login failed. Please verify credentials.';
      throw new Error(errorMsg);
    }

    setToken(data.access_token);
    setCurrentUser(data.user);
    localStorage.setItem('civic_token', data.access_token);
    localStorage.setItem('civic_user', JSON.stringify(data.user));
    return data.user;
  };

  // Register Citizen handler
  const register = async (formData) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data?.detail || data?.error?.message || 'Registration failed.';
      throw new Error(errorMsg);
    }

    setToken(data.access_token);
    setCurrentUser(data.user);
    localStorage.setItem('civic_token', data.access_token);
    localStorage.setItem('civic_user', JSON.stringify(data.user));
    return data.user;
  };

  // 1-Click Demo Role Switcher (for hackathon evaluation)
  const switchDemoRole = async (targetRole) => {
    try {
      const res = await fetch('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_role: targetRole })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        setCurrentUser(data.user);
        localStorage.setItem('civic_token', data.access_token);
        localStorage.setItem('civic_user', JSON.stringify(data.user));
        return data.user;
      }
    } catch (e) {
      console.error('Role switch error:', e);
    }
  };

  // Logout handler
  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('civic_token');
    localStorage.removeItem('civic_user');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        login,
        register,
        logout,
        switchDemoRole,
        authFetch,
        isAuthenticated: !!currentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
