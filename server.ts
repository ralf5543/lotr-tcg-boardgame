// @ts-expect-error - Chemin CJS interne boardgame.io sans types explicites
import { Server, Origins } from 'boardgame.io/dist/cjs/server.js';
import { LotrGame } from './src/game';

const server = Server({
    games: [LotrGame],
    origins: [Origins.LOCALHOST],
});

server.run(8000, () => {
    console.log('Serveur boardgame.io démarré sur http://localhost:8000');
})