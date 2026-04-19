import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tanstackStart(),
    // react's plugin must come after start's plugin
    viteReact(),
    // On Vercel the preset is picked automatically. Locally, we default to node-server
    // (override with NITRO_PRESET=vercel for parity builds).
    nitro(),
  ],
});
