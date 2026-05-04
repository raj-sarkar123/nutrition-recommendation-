import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/*
  FIX: Removed StrictMode.
  StrictMode double-invokes every useEffect in development, which means:
    - AuthContext's localStorage read fires twice
    - ScanContext's history fetch fires twice
    - Every page's data fetch fires twice
  This makes navigation feel slow in dev and masks real performance issues.
  Remove it for a realistic feel during development; re-add only for audits.

  FIX: Switch from visibility → opacity for the icon reveal.
  visibility:hidden causes layout to hold space but re-triggers paint on reveal.
  opacity:0 → opacity:1 is GPU-composited — zero reflow, zero repaint.
*/
document.fonts.ready.then(() => {
  const style = document.createElement('style');
  // Batch-reveal all icons in one paint tick
  style.textContent = '.material-symbols-outlined { opacity: 1 !important; }';
  document.head.appendChild(style);
});

// Keep Render free tier awake — only ping in production
if (import.meta.env.PROD) {
  const BACKEND = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'https://nutrition-recommendation.onrender.com';

  const keepAlive = () => fetch(`${BACKEND}/api/health`).catch(() => { });
  keepAlive();
  setInterval(keepAlive, 10 * 60 * 1000);
}

createRoot(document.getElementById('root')).render(<App />)