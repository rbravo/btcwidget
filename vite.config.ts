import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    // Chromium antigo do Raspberry Pi OS (Buster/Bullseye) também precisa rodar isso
    target: 'chrome87',
    cssTarget: 'chrome87',
    // tudo embutido no index.html
    assetsInlineLimit: 100_000_000,
    reportCompressedSize: false,
  },
});
