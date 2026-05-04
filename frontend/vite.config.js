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
        manualChunks: {
          // Core React — loaded once, cached forever
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Pages grouped by usage pattern
          'pages-auth': [
            './src/pages/LoginPage',
            './src/pages/SignupPage',
            './src/pages/OnboardingPage',
          ],
          'pages-app': [
            './src/pages/DashboardPage',
            './src/pages/TrackerPage',
            './src/pages/ProgressPage',
            './src/pages/ProfilePage',
          ],
          'pages-scan': [
            './src/pages/ScanPage',
            './src/pages/AnalysisPage',
            './src/pages/SmartInsightsPage',
          ],
        }
      }
    },
    // Warn if any chunk exceeds 500kb
    chunkSizeWarningLimit: 500,
  }
})