import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db';
import { findUserById, type UserRow } from './users';

export const SESSION_COOKIE = 'lotr_session';
/** 30 jours. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SessionRow = {
    token_hash: string;
    user_id: string;
    expires_at: string;
    created_at: string;
};

export function hashSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function createSession(db: Db, userId: string): {
    token: string;
    expiresAt: Date;
} {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashSessionToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    db.prepare(
        `INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
         VALUES (?, ?, ?, ?)`
    ).run(tokenHash, userId, expiresAt.toISOString(), now.toISOString());

    return { token, expiresAt };
}

export function deleteSessionByToken(db: Db, token: string): void {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
        hashSessionToken(token)
    );
}

export function deleteExpiredSessions(db: Db): void {
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(
        new Date().toISOString()
    );
}

export function findUserBySessionToken(
    db: Db,
    token: string | undefined | null
): UserRow | null {
    if (!token) return null;
    const row = db
        .prepare('SELECT * FROM sessions WHERE token_hash = ?')
        .get(hashSessionToken(token)) as SessionRow | undefined;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
            row.token_hash
        );
        return null;
    }
    return findUserById(db, row.user_id) ?? null;
}

export function parseCookies(
    header: string | undefined
): Record<string, string> {
    if (!header) return {};
    const out: Record<string, string> = {};
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx <= 0) continue;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (!key) continue;
        try {
            out[key] = decodeURIComponent(value);
        } catch {
            out[key] = value;
        }
    }
    return out;
}

export function buildSessionCookie(
    token: string,
    expiresAt: Date,
    opts: { secure: boolean }
): string {
    const parts = [
        `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Expires=${expiresAt.toUTCString()}`,
        `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    ];
    if (opts.secure) parts.push('Secure');
    return parts.join('; ');
}

export function buildClearSessionCookie(opts: { secure: boolean }): string {
    const parts = [
        `${SESSION_COOKIE}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'Max-Age=0',
    ];
    if (opts.secure) parts.push('Secure');
    return parts.join('; ');
}
