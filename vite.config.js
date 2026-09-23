import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({ 
  plugins: [vue()], 
  server: { host: true }, 
  build: { 
    target: 'es2020',
    rollupOptions: {
      input: 'index.source.html'
    }
  } 
})
