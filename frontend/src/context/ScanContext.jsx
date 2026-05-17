import { createContext, useContext, useState, useCallback } from 'react';

/**
 * ScanContext — persists scan results and history across tab navigation.
 * History is keyed by user ID so different accounts on the same browser
 * never share scan data.
 */

const BASE_KEY = 'nutriscan_scan_history';

// Returns a user-scoped storage key, falls back to a guest key
const getStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem('nutriscan_user'));
    return user?.id ? `${BASE_KEY}_${user.id}` : `${BASE_KEY}_guest`;
  } catch {
    return `${BASE_KEY}_guest`;
  }
};

const loadHistory = () => {
  try {
    const saved = localStorage.getItem(getStorageKey());
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const ScanContext = createContext(null);

export const ScanProvider = ({ children }) => {
  const [currentScan, setCurrentScan]   = useState(null);
  const [isScanning, setIsScanning]     = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage]       = useState('');
  const [scanError, setScanError]       = useState('');

  // Load history scoped to the current user on first render
  const [history, setHistory] = useState(() => loadHistory());

  /** Save a completed scan to history (newest first, user-scoped) */
  const saveToHistory = useCallback((scanData) => {
    setHistory(prev => {
      const entry = {
        ...scanData,
        savedAt: new Date().toISOString(),
        id: scanData.scan_id || Date.now().toString(),
      };
      const updated = [entry, ...prev].slice(0, 50);
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
      } catch { /* storage full — ignore */ }
      return updated;
    });
  }, []);

  /** Set the active scan result and persist it to history */
  const completeScan = useCallback((scanData) => {
    setCurrentScan(scanData);
    saveToHistory(scanData);
    setIsScanning(false);
    setScanProgress(100);
    setScanStage('Complete');
  }, [saveToHistory]);

  /** Start a new scan — resets progress state */
  const startScan = useCallback(() => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStage('Uploading image…');
    setScanError('');
    setCurrentScan(null);
  }, []);

  /** Remove a single history entry */
  const deleteHistoryEntry = useCallback((id) => {
    // If the deleted entry is the one currently displayed, clear it
    setCurrentScan(prev => {
      const currentId = prev?.id || prev?.scan_id;
      return (currentId && String(currentId) === String(id)) ? null : prev;
    });
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  /** Clear all history for the current user */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentScan(null);
    try {
      localStorage.removeItem(getStorageKey());
    } catch { /* ignore */ }
  }, []);

  /**
   * Call this on login — reloads history from the newly logged-in user's key.
   * Wire this up in AuthContext after setUser().
   */
  const reloadHistoryForUser = useCallback(() => {
    setHistory(loadHistory());
    setCurrentScan(null);
  }, []);

  /**
   * Call this on logout — wipes in-memory state so the next user
   * starts with a clean slate.
   */
  const clearSessionOnLogout = useCallback(() => {
    setHistory([]);
    setCurrentScan(null);
    setScanProgress(0);
    setScanStage('');
    setScanError('');
  }, []);

  return (
    <ScanContext.Provider value={{
      currentScan,
      setCurrentScan,
      isScanning,
      setIsScanning,
      scanProgress,
      setScanProgress,
      scanStage,
      setScanStage,
      history,
      startScan,
      completeScan,
      saveToHistory,
      deleteHistoryEntry,
      clearHistory,
      scanError,
      setScanError,
      reloadHistoryForUser,
      clearSessionOnLogout,
    }}>
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
};

export { ScanContext };   // ← named export so AuthContext can import it

export default ScanContext;