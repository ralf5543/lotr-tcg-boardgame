import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import type { DeckConfig } from './src/decks/types';

const DECKS_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'src/game/decks'
);

function sendJson(
    res: ServerResponse,
    status: number,
    body: unknown
): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
}

function isDeckConfig(value: unknown): value is DeckConfig {
    if (!value || typeof value !== 'object') return false;
    const d = value as Record<string, unknown>;
    return (
        typeof d.id === 'string' &&
        typeof d.name === 'string' &&
        typeof d.ringBearerId === 'string' &&
        typeof d.oneRingId === 'string' &&
        Array.isArray(d.startingCompanionIds) &&
        Array.isArray(d.freePeople) &&
        Array.isArray(d.shadow) &&
        Array.isArray(d.siteIds)
    );
}

function safeFileStem(id: string): string {
    const stem = id
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!stem || stem.includes('..')) {
        throw new Error(`Identifiant de deck invalide : ${id}`);
    }
    return stem;
}

function listDeckFiles(): string[] {
    if (!fs.existsSync(DECKS_DIR)) return [];
    return fs
        .readdirSync(DECKS_DIR)
        .filter((name) => name.endsWith('.json'))
        .map((name) => path.join(DECKS_DIR, name));
}

function readDeckFile(filePath: string): DeckConfig | null {
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
        if (!isDeckConfig(raw)) return null;
        return raw;
    } catch {
        return null;
    }
}

type DeckEntry = { filePath: string; deck: DeckConfig };

function readAllEntries(): DeckEntry[] {
    const entries: DeckEntry[] = [];
    for (const filePath of listDeckFiles()) {
        const deck = readDeckFile(filePath);
        if (!deck) continue;
        // Si l’id JSON est absent/faux, on retombe sur le nom de fichier.
        const stem = path.basename(filePath, '.json');
        entries.push({
            filePath,
            deck: { ...deck, id: deck.id || stem },
        });
    }
    return entries;
}

function findEntryById(id: string): DeckEntry | undefined {
    const entries = readAllEntries();
    return (
        entries.find((e) => e.deck.id === id) ||
        entries.find((e) => path.basename(e.filePath, '.json') === id)
    );
}

function writeDeck(deck: DeckConfig, existingPath?: string): string {
    const stem = safeFileStem(deck.id);
    const target = existingPath || path.join(DECKS_DIR, `${stem}.json`);
    if (path.dirname(target) !== DECKS_DIR) {
        throw new Error('Chemin de deck hors dossier autorisé.');
    }
    if (!fs.existsSync(DECKS_DIR)) {
        fs.mkdirSync(DECKS_DIR, { recursive: true });
    }
    fs.writeFileSync(target, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
    return target;
}

/**
 * API DEV : CRUD des decks JSON dans `src/game/decks/`.
 * - GET    /api/decks
 * - GET    /api/decks/:id
 * - PUT    /api/decks/:id
 * - DELETE /api/decks/:id
 * - POST   /api/decks
 */
export function decksFileApiPlugin(): Plugin {
    return {
        name: 'decks-file-api',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = req.url;
                if (!url || !url.startsWith('/api/decks')) {
                    next();
                    return;
                }

                try {
                    const pathname = url.split('?')[0] || '';
                    const method = (req.method || 'GET').toUpperCase();

                    if (pathname === '/api/decks' && method === 'GET') {
                        const decks = readAllEntries().map((e) => e.deck);
                        sendJson(res, 200, { decks });
                        return;
                    }

                    if (pathname === '/api/decks' && method === 'POST') {
                        const raw = await readBody(req);
                        const parsed = raw
                            ? (JSON.parse(raw) as unknown)
                            : null;
                        let deck: DeckConfig;
                        if (isDeckConfig(parsed)) {
                            deck = parsed;
                        } else {
                            const id = `deck-${Date.now()}`;
                            deck = {
                                id,
                                name:
                                    parsed &&
                                    typeof parsed === 'object' &&
                                    typeof (parsed as { name?: unknown })
                                        .name === 'string'
                                        ? (parsed as { name: string }).name
                                        : 'Nouveau deck',
                                ringBearerId: '1C290',
                                oneRingId: '4R1',
                                startingCompanionIds: [],
                                freePeople: [],
                                shadow: [],
                                siteIds: [],
                            };
                        }
                        writeDeck(deck);
                        sendJson(res, 201, { deck });
                        return;
                    }

                    const match = pathname.match(/^\/api\/decks\/([^/]+)$/);
                    if (!match) {
                        sendJson(res, 404, { error: 'Route inconnue' });
                        return;
                    }
                    const id = decodeURIComponent(match[1]!);

                    if (method === 'GET') {
                        const entry = findEntryById(id);
                        if (!entry) {
                            sendJson(res, 404, { error: 'Deck introuvable' });
                            return;
                        }
                        sendJson(res, 200, { deck: entry.deck });
                        return;
                    }

                    if (method === 'PUT') {
                        const raw = await readBody(req);
                        const parsed = JSON.parse(raw) as unknown;
                        if (!isDeckConfig(parsed)) {
                            sendJson(res, 400, {
                                error: 'Corps JSON invalide',
                            });
                            return;
                        }
                        if (parsed.id !== id) {
                            sendJson(res, 400, {
                                error: 'L’id du corps doit correspondre à l’URL',
                            });
                            return;
                        }
                        const existing = findEntryById(id);
                        writeDeck(parsed, existing?.filePath);
                        sendJson(res, 200, { deck: parsed });
                        return;
                    }

                    if (method === 'DELETE') {
                        const entry = findEntryById(id);
                        if (!entry) {
                            sendJson(res, 404, { error: 'Deck introuvable' });
                            return;
                        }
                        fs.unlinkSync(entry.filePath);
                        sendJson(res, 200, { ok: true });
                        return;
                    }

                    sendJson(res, 405, { error: 'Méthode non autorisée' });
                } catch (err) {
                    const message =
                        err instanceof Error ? err.message : String(err);
                    sendJson(res, 500, { error: message });
                }
            });
        },
    };
}
