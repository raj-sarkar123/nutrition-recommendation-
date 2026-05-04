import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Reveal material icons only after font is ready
document.fonts.ready.then(() => {
  const style = document.createElement('style');
  style.textContent = '.material-symbols-outlined { visibility: visible; }';
  document.head.appendChild(style);
});

// Keep Render free tier awake — only ping in production
// Locally this would cause CORS errors since it bypasses the Vite proxy
if (import.meta.env.PROD) {
  const BACKEND = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'https://nutrition-recommendation.onrender.com';

  const keepAlive = () => {
    fetch(`${BACKEND}/api/health`).catch(() => {});
  };
  keepAlive();
  setInterval(keepAlive, 10 * 60 * 1000);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)