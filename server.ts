// @ts-expect-error - Chemin CJS interne boardgame.io sans types explicites
import { Server, Origins } from 'boardgame.io/dist/cjs/server.js';
import { LotrGame } from './src/game';

const server = Server({
    games: [LotrGame],
    origins: [
        Origins.LOCALHOST,
        // Autorise toutes les requêtes provenant du port 5173 sur le réseau local
        /^http:\/\/192\.168\.\d+\.\d+:5173$/,
    ],
});

// Écoute sur l'interface 0.0.0.0 pour accepter le réseau Wi-Fi
server.run({ port: 8000, host: '0.0.0.0' }, () => {
    console.log('Serveur boardgame.io démarré sur http://0.0.0.0:8000');
});