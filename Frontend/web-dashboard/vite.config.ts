import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
      build: {
    outDir: 'build', // This is where your built files will go
    emptyOutDir: true, // Cleans the build folder before building
    sourcemap: true, // Optional: generates source maps
  },
    server: {
      port: 5173,
      open: true,
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version),
    },

  };
});