import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type Db = Database.Database;

let dbSingleton: Db | null = null;

/** Chemin BDD : `LOTR_DB_PATH` ou `data/lotr.sqlite` à la racine du repo. */
export function resolveDbPath(): string {
    const fromEnv = process.env.LOTR_DB_PATH?.trim();
    if (fromEnv) return path.resolve(fromEnv);
    return path.resolve(process.cwd(), 'data', 'lotr.sqlite');
}

export function openDb(dbPath = resolveDbPath()): Db {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
    return db;
}

export function getDb(): Db {
    if (!dbSingleton) {
        dbSingleton = openDb();
    }
    return dbSingleton;
}

/** Tests : BDD isolée (fichier ou `:memory:`). */
export function resetDbForTests(dbPath: string): Db {
    if (dbSingleton) {
        try {
            dbSingleton.close();
        } catch {
            /* ignore */
        }
        dbSingleton = null;
    }
    if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }
    dbSingleton = openDb(dbPath);
    return dbSingleton;
}

function migrate(db: Db): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL COLLATE NOCASE,
            password_hash TEXT,
            google_id TEXT,
            display_name TEXT NOT NULL DEFAULT '',
            avatar_id TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
            ON users (email COLLATE NOCASE);

        CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique
            ON users (google_id)
            WHERE google_id IS NOT NULL;

        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS sessions_user_id
            ON sessions (user_id);

        CREATE INDEX IF NOT EXISTS sessions_expires_at
            ON sessions (expires_at);

        CREATE TABLE IF NOT EXISTS decks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS decks_user_id
            ON decks (user_id);
    `);
}
