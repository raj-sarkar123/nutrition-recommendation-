import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useScan } from './ScanContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const { reloadHistoryForUser, clearSessionOnLogout } = useScan();

  useEffect(() => {
    const savedToken = localStorage.getItem('nutriscan_token');
    const savedUser = localStorage.getItem('nutriscan_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const authUser = { ...data.user, isNewUser: !data.onboarding_completed };
    setToken(data.token);
    setUser(authUser);
    localStorage.setItem('nutriscan_token', data.token);
    localStorage.setItem('nutriscan_user', JSON.stringify(authUser));
    reloadHistoryForUser();
    return data;
  };

  const signup = async (full_name, email, password) => {
    const { data } = await api.post('/auth/signup', { full_name, email, password });
    const authUser = { ...data.user, isNewUser: true };
    setToken(data.token);
    setUser(authUser);
    localStorage.setItem('nutriscan_token', data.token);
    localStorage.setItem('nutriscan_user', JSON.stringify(authUser));
    reloadHistoryForUser();
    return data;
  };

  const logout = () => {
    clearSessionOnLogout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('nutriscan_token');
    localStorage.removeItem('nutriscan_user');
  };

  const updateUser = (updatedUser) => {
    setUser(prev => {
      const updated = { ...prev, ...updatedUser };
      localStorage.setItem('nutriscan_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Export context only if needed for direct consumption (e.g. class components)
// Named export keeps Fast Refresh happy — no default export of a non-component
export { AuthContext };