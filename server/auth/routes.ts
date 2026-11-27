import type { Context, Middleware } from 'koa';
import Router from '@koa/router';
import { getDb } from '../db';
import {
    assertPasswordPolicy,
    hashPassword,
    verifyPassword,
} from './passwords';
import {
    buildClearSessionCookie,
    buildSessionCookie,
    createSession,
    deleteSessionByToken,
    findUserBySessionToken,
    parseCookies,
    SESSION_COOKIE,
} from './sessions';
import {
    createUserWithPassword,
    findUserByEmail,
    normalizeEmail,
    toPublicUser,
} from './users';

type KoaCtx = Context & {
    request: Context['request'] & { body?: unknown };
};

function readBody(ctx: KoaCtx): Record<string, unknown> {
    const body = ctx.request.body;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
        return body as Record<string, unknown>;
    }
    return {};
}

function wantsSecureCookie(ctx: KoaCtx): boolean {
    if (process.env.COOKIE_SECURE === '1') return true;
    if (process.env.COOKIE_SECURE === '0') return false;
    const proto = String(ctx.get('x-forwarded-proto') || ctx.protocol || '');
    return proto === 'https';
}

function setSessionCookie(
    ctx: KoaCtx,
    token: string,
    expiresAt: Date
): void {
    ctx.set(
        'Set-Cookie',
        buildSessionCookie(token, expiresAt, {
            secure: wantsSecureCookie(ctx),
        })
    );
}

function clearSessionCookie(ctx: KoaCtx): void {
    ctx.set(
        'Set-Cookie',
        buildClearSessionCookie({ secure: wantsSecureCookie(ctx) })
    );
}

function sessionTokenFromCtx(ctx: KoaCtx): string | undefined {
    return parseCookies(ctx.get('cookie'))[SESSION_COOKIE];
}

export function createAuthRouter(): Router {
    const router = new Router({ prefix: '/api/auth' });

    router.post('/register', async (ctx) => {
        const c = ctx as KoaCtx;
        const body = readBody(c);
        const email = normalizeEmail(body.email);
        if (!email) {
            c.status = 400;
            c.body = { error: 'INVALID_EMAIL' };
            return;
        }
        const password =
            typeof body.password === 'string' ? body.password : '';
        const policy = assertPasswordPolicy(password);
        if (policy) {
            c.status = 400;
            c.body = { error: 'WEAK_PASSWORD', message: policy };
            return;
        }

        const db = getDb();
        if (findUserByEmail(db, email)) {
            c.status = 409;
            c.body = { error: 'EMAIL_TAKEN' };
            return;
        }

        const passwordHash = await hashPassword(password);
        const displayName =
            typeof body.displayName === 'string'
                ? body.displayName
                : typeof body.name === 'string'
                  ? body.name
                  : '';
        const avatarId =
            typeof body.avatarId === 'string' ? body.avatarId : '';

        const user = createUserWithPassword(db, {
            email,
            passwordHash,
            displayName,
            avatarId,
        });
        const { token, expiresAt } = createSession(db, user.id);
        setSessionCookie(c, token, expiresAt);
        c.status = 201;
        c.body = { user: toPublicUser(user) };
    });

    router.post('/login', async (ctx) => {
        const c = ctx as KoaCtx;
        const body = readBody(c);
        const email = normalizeEmail(body.email);
        const password =
            typeof body.password === 'string' ? body.password : '';
        if (!email || !password) {
            c.status = 400;
            c.body = { error: 'INVALID_CREDENTIALS' };
            return;
        }

        const db = getDb();
        const user = findUserByEmail(db, email);
        if (!user?.password_hash) {
            c.status = 401;
            c.body = { error: 'INVALID_CREDENTIALS' };
            return;
        }
        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) {
            c.status = 401;
            c.body = { error: 'INVALID_CREDENTIALS' };
            return;
        }

        const { token, expiresAt } = createSession(db, user.id);
        setSessionCookie(c, token, expiresAt);
        c.status = 200;
        c.body = { user: toPublicUser(user) };
    });

    router.post('/logout', async (ctx) => {
        const c = ctx as KoaCtx;
        const db = getDb();
        const token = sessionTokenFromCtx(c);
        if (token) deleteSessionByToken(db, token);
        clearSessionCookie(c);
        c.status = 204;
        c.body = null;
    });

    router.get('/me', async (ctx) => {
        const c = ctx as KoaCtx;
        const db = getDb();
        const user = findUserBySessionToken(db, sessionTokenFromCtx(c));
        if (!user) {
            c.status = 401;
            c.body = { error: 'UNAUTHENTICATED' };
            return;
        }
        c.status = 200;
        c.body = { user: toPublicUser(user) };
    });

    return router;
}

/** Middleware optionnel : attache `ctx.state.user` si cookie valide. */
export function attachUserMiddleware(): Middleware {
    return async (ctx, next) => {
        const c = ctx as KoaCtx;
        try {
            const user = findUserBySessionToken(
                getDb(),
                sessionTokenFromCtx(c)
            );
            if (user) {
                c.state.user = toPublicUser(user);
            }
        } catch {
            /* BDD absente / erreur — laisser les routes répondre */
        }
        await next();
    };
}
