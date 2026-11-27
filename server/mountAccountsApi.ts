import type Application from 'koa';
import koaBody from 'koa-body';
import { getDb } from './db';
import { deleteExpiredSessions } from './auth/sessions';
import { attachUserMiddleware, createAuthRouter } from './auth/routes';

/**
 * Monte l’API comptes (`/api/auth/…`) sur l’app Koa boardgame.io.
 */
export function mountAccountsApi(app: Application): void {
    getDb();
    try {
        deleteExpiredSessions(getDb());
    } catch (err) {
        console.warn('[accounts] nettoyage sessions échoué', err);
    }

    app.use(
        koaBody({
            json: true,
            jsonLimit: '1mb',
            multipart: false,
            urlencoded: true,
            text: false,
        })
    );
    app.use(attachUserMiddleware());

    const authRouter = createAuthRouter();
    app.use(authRouter.routes());
    app.use(authRouter.allowedMethods());
}
