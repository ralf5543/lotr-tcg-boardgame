import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc' // 👈 Changement d'import ici !

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
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});