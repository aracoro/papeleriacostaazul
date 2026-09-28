import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, getUserProfile, getSavedUser, getSavedSession, saveSession, clearSession } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSavedUser());
  const [session, setSession] = useState(() => getSavedSession());
  const [loading, setLoading] = useState(true);

  function saveAuth(dataUser, dataSession) {
    setUser(dataUser || null);
    setSession(dataSession || null);
    saveSession(dataUser, dataSession);
  }

  function clearAuth() {
    setUser(null);
    setSession(null);
    clearSession();
  }

  // Al abrir la app, el servidor revalida el token guardado
  useEffect(() => {
    (async () => {
      const { data, error } = await getUserProfile();
      if (!error && data?.user) saveAuth(data.user, data.session);
      else clearAuth();
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await loginUser(email, password);
    setLoading(false);

    if (error) return { error };

    saveAuth(data?.user || null, data?.session || null);
    return { data: data?.user || null };
  };

  const logout = async () => {
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
