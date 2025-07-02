import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (window.api?.auth?.getSession) {
          const session = await window.api.auth.getSession();
          setUser(session || null);
        } else {
          console.error('window.api.auth not available');
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setUser(null);
      }
    };

    loadSession();
  }, []);

  const login = async (email, password) => {
    try {
      const u = await window.api.auth.login({ email, password });
      setUser(u);
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const register = async (name, email, password) => {
    try {
      const u = await window.api.auth.register({ name, email, password });
      setUser(u);
    } catch (err) {
      console.error('Register failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await window.api.auth.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
