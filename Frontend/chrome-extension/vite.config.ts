import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        'content-scripts/gmail-injector': resolve(__dirname, 'src/content-scripts/gmail-injector.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          if (chunk.name === 'content-scripts/gmail-injector') return 'content-scripts/gmail-injector.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'inject.css') return 'styles/inject.css';
          return 'assets/[name].[ext]';
        },
      },
    },
  },
});


// FIREFOX
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import { resolve } from "path";
// import tailwindcss from "@tailwindcss/vite";

// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   build: {
//     outDir: "dist",
//     rollupOptions: {
//       input: {
//         background: resolve(__dirname, "src/background.ts"),
//         popup: resolve(__dirname, "src/popup/index.html"), // inside src/popup
//         "content-scripts/gmail-injector": resolve(
//           __dirname,
//           "src/content-scripts/gmail-injector.ts"
//         ),
//       },
//       output: {
//         entryFileNames: "[name].js",
//         chunkFileNames: "[name].js",
//         assetFileNames: "[name].[ext]",
//       },
//     },
//   },
// });
