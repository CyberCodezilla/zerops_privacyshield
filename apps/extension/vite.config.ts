import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Custom plugin to copy manifest.json into dist
function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      if (fs.existsSync('manifest.json')) {
        fs.copyFileSync('manifest.json', 'dist/manifest.json');
      }
      if (!fs.existsSync('dist/icons')) {
        fs.mkdirSync('dist/icons', { recursive: true });
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        serviceWorker: resolve(__dirname, 'src/background/serviceWorker.ts'),
        injector: resolve(__dirname, 'src/content/injector.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'serviceWorker') return 'src/background/serviceWorker.js';
          if (chunkInfo.name === 'injector') return 'src/content/injector.js';
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
