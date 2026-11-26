import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = path.resolve(ROOT, 'public/avatars');
const OUT_FILE = path.resolve(ROOT, 'src/session/avatarList.generated.ts');

const IMAGE_RE = /\.(png|webp|jpe?g|gif)$/i;

function listAvatarEntries(): Array<{ id: string; path: string }> {
    if (!fs.existsSync(AVATARS_DIR)) return [];
    return fs
        .readdirSync(AVATARS_DIR)
        .filter((name) => IMAGE_RE.test(name) && !name.startsWith('.'))
        .sort((a, b) => a.localeCompare(b, 'en'))
        .map((filename) => {
            const id = filename.replace(/\.[^.]+$/, '');
            return { id, path: `avatars/${filename}` };
        });
}

function writeGeneratedList(): void {
    const entries = listAvatarEntries();
    const body = `/**
 * Généré automatiquement depuis public/avatars/ — ne pas éditer.
 * Relancé au démarrage Vite / Vitest (plugin session-avatars).
 */
export const SESSION_AVATARS = ${JSON.stringify(entries, null, 4)} as const;

export type SessionAvatarId = (typeof SESSION_AVATARS)[number]['id'];
`;

    const previous = fs.existsSync(OUT_FILE)
        ? fs.readFileSync(OUT_FILE, 'utf8')
        : '';
    if (previous === body) return;
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, body, 'utf8');
}

/** Scanne `public/avatars` → `src/session/avatarList.generated.ts`. */
export function sessionAvatarsPlugin(): Plugin {
    return {
        name: 'session-avatars',
        buildStart() {
            writeGeneratedList();
        },
        configureServer(server) {
            writeGeneratedList();
            server.watcher.add(AVATARS_DIR);
            const refresh = (file: string) => {
                if (!file.startsWith(AVATARS_DIR)) return;
                writeGeneratedList();
            };
            server.watcher.on('add', refresh);
            server.watcher.on('unlink', refresh);
            server.watcher.on('change', refresh);
        },
    };
}
