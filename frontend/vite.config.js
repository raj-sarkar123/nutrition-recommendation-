/* eslint-env node */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const target = process.env.VITE_API_TARGET || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom')
            ) {
              return 'vendor-react';
            }
            return 'vendor';
          }

          if (id.includes('/src/pages/')) {
            if (
              id.includes('LoginPage') ||
              id.includes('SignupPage') ||
              id.includes('OnboardingPage')
            ) {
              return 'pages-auth';
            }

            if (
              id.includes('DashboardPage') ||
              id.includes('TrackerPage') ||
              id.includes('ProgressPage') ||
              id.includes('ProfilePage')
            ) {
              return 'pages-app';
            }

            if (
              id.includes('ScanPage') ||
              id.includes('AnalysisPage') ||
              id.includes('SmartInsightsPage')
            ) {
              return 'pages-scan';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
  }
})