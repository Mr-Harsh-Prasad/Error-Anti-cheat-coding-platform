import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        problems: resolve(__dirname, 'problems.html'),
        editor: resolve(__dirname, 'editor.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
