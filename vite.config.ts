import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc' // 👈 Changement d'import ici !
import { decksFileApiPlugin } from './vite.decksApi'
import { sessionAvatarsPlugin } from './vite.sessionAvatars'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      plugins: [
        ['@swc/plugin-styled-components', { 
            displayName: true,
            fileName: true // On l'active pour voir le nom du fichier !
        }]
      ],
    }),
    decksFileApiPlugin(),
    sessionAvatarsPlugin(),
  ],
  // DEV : API comptes sur le même serveur Node que boardgame.io.
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
});