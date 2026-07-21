import { Server, Origins } from 'boardgame.io/dist/cjs/server.js';
import { LotrGame } from './src/game/Game';

const server = Server({
    games: [LotrGame],
    origins: [Origins.LOCALHOST],
});

server.run({
    port: 8000,
    host: '0.0.0.0',
});