import { randomUUID } from 'node:crypto';
import type { Db } from '../db';

export type UserRow = {
    id: string;
    email: string;
    password_hash: string | null;
    google_id: string | null;
    display_name: string;
    avatar_id: string;
    created_at: string;
    updated_at: string;
};

export type PublicUser = {
    id: string;
    email: string;
    displayName: string;
    avatarId: string;
};

export function toPublicUser(row: UserRow): PublicUser {
    return {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        avatarId: row.avatar_id,
    };
}

export function normalizeEmail(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const email = raw.trim().toLowerCase();
    if (!email || email.length > 254) return null;
    // Basique : doit contenir un @ avec un domaine.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return email;
}

export function findUserByEmail(db: Db, email: string): UserRow | undefined {
    return db
        .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
        .get(email) as UserRow | undefined;
}

export function findUserById(db: Db, id: string): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
        | UserRow
        | undefined;
}

export function createUserWithPassword(
    db: Db,
    input: {
        email: string;
        passwordHash: string;
        displayName?: string;
        avatarId?: string;
    }
): UserRow {
    const now = new Date().toISOString();
    const id = randomUUID();
    const displayName = (input.displayName || '').trim().slice(0, 24);
    const avatarId = (input.avatarId || '').trim().slice(0, 64);

    db.prepare(
        `INSERT INTO users
            (id, email, password_hash, google_id, display_name, avatar_id, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`
    ).run(
        id,
        input.email,
        input.passwordHash,
        displayName,
        avatarId,
        now,
        now
    );

    const row = findUserById(db, id);
    if (!row) throw new Error('User insert failed');
    return row;
}
