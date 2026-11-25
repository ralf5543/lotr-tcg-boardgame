// @ts-expect-error - Chemin CJS interne boardgame.io sans types explicites
import { Server, Origins } from 'boardgame.io/dist/cjs/server.js';
import { LotrGame } from './src/game';

const PORT = Number(process.env.PORT || 8000);
const MAX_ACTIVE_MATCHES = Number(process.env.MAX_ACTIVE_MATCHES || 20);

/** Origines supplémentaires (prod) : `CORS_ORIGINS=https://jeu.example.fr,http://77.x.x.x` */
function extraCorsOrigins(): Array<string | RegExp> {
    return String(process.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

const server = Server({
    games: [LotrGame],
    origins: [
        Origins.LOCALHOST,
        // Wi‑Fi local (Vite DEV)
        /^http:\/\/192\.168\.\d+\.\d+:5173$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
        ...extraCorsOrigins(),
    ],
});

/**
 * Plafond de parties non terminées — avant la route create de boardgame.io.
 * Koa : premier `use` = couche externe (s’exécute en premier).
 */
server.app.use(async (ctx: {
    method: string;
    path: string;
    status: number;
    body: unknown;
}, next: () => Promise<unknown>) => {
    if (
        ctx.method === 'POST' &&
        /^\/games\/[^/]+\/create\/?$/.test(ctx.path)
    ) {
        const active: string[] = await server.db.listMatches({
            gameName: 'lotr',
            where: { isGameover: false },
        });
        if (active.length >= MAX_ACTIVE_MATCHES) {
            ctx.status = 503;
            ctx.body = {
                error: 'SERVER_FULL',
                max: MAX_ACTIVE_MATCHES,
                active: active.length,
            };
            return;
        }
    }
    await next();
});

server.run({ port: PORT }, () => {
    console.log(
        `Serveur boardgame.io sur le port ${PORT} (max ${MAX_ACTIVE_MATCHES} parties actives)`
    );
});
