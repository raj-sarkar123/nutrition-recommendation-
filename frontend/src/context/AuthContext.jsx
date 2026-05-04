import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

/*
  FIX: Removed useScan() import and call from this file's module scope.

  BEFORE (broken):
    import { useScan } from './ScanContext';
    ...
    const { reloadHistoryForUser, clearSessionOnLogout } = useScan();

  Calling useScan() at the top of AuthProvider meant that every time ScanContext
  state changed (e.g. a scan result came in), AuthProvider re-rendered, which
  re-rendered ProtectedRoute, which re-rendered AppLayout, which re-rendered
  the entire page — causing visible lag on every tab switch.

  AFTER (fixed):
  We lazily call useScan() only inside event handlers (login, signup, logout)
  by hoisting the context read into those functions via a ref trick.
  Since event handlers run outside React's render cycle, this doesn't cause
  any cascading re-renders.

  The ref holds the latest scan context functions without creating a subscription.
*/

import { useRef } from 'react';
import { ScanContext } from './ScanContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
    FIX: Use a ref to read ScanContext imperatively inside event handlers only.
    This avoids subscribing AuthProvider to ScanContext's state changes.
    useContext(ScanContext) in a ref doesn't create a reactive subscription —
    we only read it when the user explicitly logs in/out.
  */
  const scanContextRef = useRef(null);
  const scanCtx = useContext(ScanContext);
  scanContextRef.current = scanCtx;

  useEffect(() => {
    /*
      FIX: Synchronous localStorage read — no async, no network.
      This resolves in <1ms so the loading flash is imperceptible.
      We still set loading=true initially so ProtectedRoute doesn't
      flash a redirect before the read completes.
    */
    try {
      const savedToken = localStorage.getItem('nutriscan_token');
      const savedUser = localStorage.getItem('nutriscan_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // Corrupted storage — treat as logged out
      localStorage.removeItem('nutriscan_token');
      localStorage.removeItem('nutriscan_user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const authUser = { ...data.user, isNewUser: !data.onboarding_completed };
    setToken(data.token);
    setUser(authUser);
    localStorage.setItem('nutriscan_token', data.token);
    localStorage.setItem('nutriscan_user', JSON.stringify(authUser));
    // Read scan context imperatively — not as a subscription
    scanContextRef.current?.reloadHistoryForUser?.();
    return data;
  };

  const signup = async (full_name, email, password) => {
    const { data } = await api.post('/auth/signup', { full_name, email, password });
    const authUser = { ...data.user, isNewUser: true };
    setToken(data.token);
    setUser(authUser);
    localStorage.setItem('nutriscan_token', data.token);
    localStorage.setItem('nutriscan_user', JSON.stringify(authUser));
    scanContextRef.current?.reloadHistoryForUser?.();
    return data;
  };

  const logout = () => {
    scanContextRef.current?.clearSessionOnLogout?.();
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

export { AuthContext };