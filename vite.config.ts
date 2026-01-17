import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  // Try to get the key from:
  // 1. System environment (Netlify settings)
  // 2. Local .env file (loaded into `env`)
  // 3. Fallback to VITE_API_KEY if the user followed standard Vite naming conventions
  const apiKey = process.env.API_KEY || env.API_KEY || process.env.VITE_API_KEY || env.VITE_API_KEY || '';

  if (!apiKey) {
    console.warn("⚠️  WARNING: API_KEY is missing in the build environment. The app will fail at runtime.");
  } else {
    console.log("✅  API_KEY found and injected.");
  }

  return {
    plugins: [react()],
    define: {
      // Replaces process.env.API_KEY in your code with the actual string value
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
    }
  };
});