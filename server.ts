import { Server, Origins } from 'boardgame.io/dist/cjs/server.js';
import { LotrGame } from './src/game/Game';

const server = Server({
    games: [LotrGame],
    origins: [Origins.LOCALHOST],
});

server.run(8000, () => {
    console.log('🟢 Serveur boardgame.io actif sur http://localhost:8000');
});