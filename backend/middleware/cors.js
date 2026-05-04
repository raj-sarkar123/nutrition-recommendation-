// middleware/cors.js
//
// Drop-in CORS middleware for Express.
// Usage in server.js / app.js — place BEFORE any routes:
//
//   const corsMiddleware = require('./middleware/cors');
//   app.use(corsMiddleware);
//
// Required env vars:
//   CLIENT_URL   — your production frontend URL, e.g. https://nutriscan.vercel.app
//                  Accepts a comma-separated list for multiple origins:
//                  CLIENT_URL=https://nutriscan.vercel.app,https://www.nutriscan.ai
//
// In development (NODE_ENV !== 'production') localhost origins are always allowed.

require('dotenv').config();

const cors = require('cors');

const productionOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const devOrigins = [
  'http://localhost:5173', // Vite default
  'http://localhost:3000', // CRA / alternate
  'http://localhost:4173', // Vite preview
];

const allowedOrigins = [
  ...productionOrigins,
  ...(process.env.NODE_ENV !== 'production' ? devOrigins : []),
];

if (process.env.NODE_ENV === 'production' && productionOrigins.length === 0) {
  console.warn(
    '[CORS] CLIENT_URL is not set. ' +
    'All cross-origin requests will be blocked in production. ' +
    'Set CLIENT_URL to your frontend\'s deployed URL.'
  );
}

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow all Vercel preview deployments for your project
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
  
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

module.exports = corsMiddleware;