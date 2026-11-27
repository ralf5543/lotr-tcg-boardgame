import { createServer, type Server } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Koa from 'koa';
import { resetDbForTests } from '../db';
import { mountAccountsApi } from '../mountAccountsApi';
import { SESSION_COOKIE } from './sessions';

function tmpDbPath(): string {
    return path.join(
        os.tmpdir(),
        `lotr-auth-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`
    );
}

describe('API auth (e-mail + MDP)', () => {
    let dbPath = '';
    let server: Server | null = null;
    let baseUrl = '';

    beforeEach(async () => {
        dbPath = tmpDbPath();
        process.env.LOTR_DB_PATH = dbPath;
        process.env.COOKIE_SECURE = '0';
        resetDbForTests(dbPath);

        const app = new Koa();
        mountAccountsApi(app);
        server = createServer(app.callback());
        await new Promise<void>((resolve) => {
            server!.listen(0, '127.0.0.1', () => resolve());
        });
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
            throw new Error('port indisponible');
        }
        baseUrl = `http://127.0.0.1:${addr.port}`;
    });

    afterEach(async () => {
        await new Promise<void>((resolve, reject) => {
            if (!server) {
                resolve();
                return;
            }
            server.close((err) => (err ? reject(err) : resolve()));
        });
        server = null;
        try {
            fs.unlinkSync(dbPath);
            fs.unlinkSync(`${dbPath}-wal`);
            fs.unlinkSync(`${dbPath}-shm`);
        } catch {
            /* ignore */
        }
        delete process.env.LOTR_DB_PATH;
        delete process.env.COOKIE_SECURE;
    });

    async function json(
        method: string,
        urlPath: string,
        body?: unknown,
        cookie?: string
    ): Promise<{
        status: number;
        body: unknown;
        setCookie: string | null;
    }> {
        const res = await fetch(`${baseUrl}${urlPath}`, {
            method,
            headers: {
                ...(body !== undefined
                    ? { 'Content-Type': 'application/json' }
                    : {}),
                ...(cookie ? { Cookie: cookie } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        let parsed: unknown = null;
        if (text) {
            try {
                parsed = JSON.parse(text);
            } catch {
                parsed = text;
            }
        }
        return {
            status: res.status,
            body: parsed,
            setCookie: res.headers.get('set-cookie'),
        };
    }

    function cookieFromSetCookie(setCookie: string | null): string {
        expect(setCookie).toBeTruthy();
        const raw = setCookie!;
        const first = raw.split(';')[0]!;
        expect(first.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
        return first;
    }

    it('register → me → logout → me 401', async () => {
        const reg = await json('POST', '/api/auth/register', {
            email: 'Ralf@Example.com',
            password: 'motdepasse1',
            displayName: 'Ralf',
            avatarId: 'frodo',
        });
        expect(reg.status).toBe(201);
        expect(reg.body).toMatchObject({
            user: {
                email: 'ralf@example.com',
                displayName: 'Ralf',
                avatarId: 'frodo',
            },
        });
        const cookie = cookieFromSetCookie(reg.setCookie);

        const me = await json('GET', '/api/auth/me', undefined, cookie);
        expect(me.status).toBe(200);
        expect(me.body).toMatchObject({
            user: { email: 'ralf@example.com', displayName: 'Ralf' },
        });

        const out = await json('POST', '/api/auth/logout', {}, cookie);
        expect(out.status).toBe(204);

        const me2 = await json('GET', '/api/auth/me', undefined, cookie);
        expect(me2.status).toBe(401);
    });

    it('refuse e-mail déjà pris et accepte login', async () => {
        await json('POST', '/api/auth/register', {
            email: 'tom@example.com',
            password: 'motdepasse1',
        });
        const again = await json('POST', '/api/auth/register', {
            email: 'tom@example.com',
            password: 'motdepasse1',
        });
        expect(again.status).toBe(409);

        const bad = await json('POST', '/api/auth/login', {
            email: 'tom@example.com',
            password: 'mauvais',
        });
        expect(bad.status).toBe(401);

        const ok = await json('POST', '/api/auth/login', {
            email: 'tom@example.com',
            password: 'motdepasse1',
        });
        expect(ok.status).toBe(200);
        expect(cookieFromSetCookie(ok.setCookie)).toContain(SESSION_COOKIE);
    });

    it('refuse mot de passe trop court', async () => {
        const res = await json('POST', '/api/auth/register', {
            email: 'x@example.com',
            password: '123',
        });
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ error: 'WEAK_PASSWORD' });
    });
});
