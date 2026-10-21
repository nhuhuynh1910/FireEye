import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_IP = '127.0.0.1';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Cho phép lắng nghe trên IP LAN (0.0.0.0)
    port: 5173,  // Cổng chạy dashboard
    proxy: {
      '/api': {
        target: `http://${BACKEND_IP}:8000`,
        changeOrigin: true,
        ws: true,
      },
      '/ws': {
        target: `ws://${BACKEND_IP}:8000`,
        ws: true,
        changeOrigin: true,
      },
      '/static': {
        target: `http://${BACKEND_IP}:8000`,
        changeOrigin: true,
      }
    }
  }
})
