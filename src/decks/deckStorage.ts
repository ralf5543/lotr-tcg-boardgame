import fumeurs from '../game/decks/fumeurs-gollum-threats.json';
import gondorUruks from '../game/decks/gondor-uruks.json';
import type { DeckConfig, SelectedDecks } from './types';

/** Ancienne clé contenu decks — nettoyée au profit des fichiers JSON. */
const LEGACY_DECKS_KEY = 'lotr.decks';
const SELECTED_KEY = 'lotr.selectedDecks';

export const SEED_DECK_FUMEURS_ID = 'fumeurs-gollum-threats';
export const SEED_DECK_GONDOR_ID = 'gondor-uruks';

const LEGACY_SELECTED_IDS: Record<string, string> = {
    'seed-fumeurs-gollum': SEED_DECK_FUMEURS_ID,
    'seed-gondor-uruks': SEED_DECK_GONDOR_ID,
};

let decksCache: DeckConfig[] | null = null;

function cloneDeck(raw: DeckConfig, id?: string, name?: string): DeckConfig {
    return {
        ...raw,
        id: id ?? raw.id,
        name: name ?? raw.name,
        startingCompanionIds: [...(raw.startingCompanionIds || [])],
        freePeople: [...(raw.freePeople || [])],
        shadow: [...(raw.shadow || [])],
        siteIds: [...(raw.siteIds || [])],
    };
}

export function getSeedDecks(): DeckConfig[] {
    return [
        cloneDeck(
            fumeurs as DeckConfig,
            SEED_DECK_FUMEURS_ID,
            'Fumeurs / Gollum (témoin)'
        ),
        cloneDeck(
            gondorUruks as DeckConfig,
            SEED_DECK_GONDOR_ID,
            'Gondor / Ourouks (témoin)'
        ),
    ];
}

function clearLegacyStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.removeItem(LEGACY_DECKS_KEY);
    } catch {
        /* ignore */
    }
}

function mapLegacyId(id: string): string {
    return LEGACY_SELECTED_IDS[id] || id;
}

async function apiJson<T>(
    path: string,
    init?: RequestInit
): Promise<T> {
    const res = await fetch(path, init);
    const text = await res.text();
    let body: unknown = null;
    if (text) {
        try {
            body = JSON.parse(text) as unknown;
        } catch {
            body = { error: text };
        }
    }
    if (!res.ok) {
        const err =
            body &&
            typeof body === 'object' &&
            'error' in body &&
            typeof (body as { error: unknown }).error === 'string'
                ? (body as { error: string }).error
                : `HTTP ${res.status}`;
        throw new Error(err);
    }
    return body as T;
}

/** Liste des decks (fichiers `src/game/decks/*.json` via API DEV). */
export async function listDecks(): Promise<DeckConfig[]> {
    clearLegacyStorage();
    try {
        const data = await apiJson<{ decks: DeckConfig[] }>('/api/decks');
        decksCache = data.decks.map((d) => cloneDeck(d));
        return decksCache;
    } catch {
        // Hors Vite / API down : seeds seulement.
        decksCache = getSeedDecks();
        return decksCache;
    }
}

export async function getDeckById(
    id: string
): Promise<DeckConfig | undefined> {
    const decks = decksCache ?? (await listDecks());
    return decks.find((d) => d.id === id);
}

export async function saveDeck(deck: DeckConfig): Promise<void> {
    const saved = await apiJson<{ deck: DeckConfig }>(
        `/api/decks/${encodeURIComponent(deck.id)}`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deck),
        }
    );
    const next = cloneDeck(saved.deck);
    if (!decksCache) {
        decksCache = [next];
        return;
    }
    const index = decksCache.findIndex((d) => d.id === next.id);
    if (index >= 0) decksCache[index] = next;
    else decksCache.push(next);
}

export async function deleteDeck(id: string): Promise<void> {
    await apiJson<{ ok: boolean }>(`/api/decks/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });
    decksCache = (decksCache ?? []).filter((d) => d.id !== id);

    const selected = getSelectedDeckIds();
    let changed = false;
    const next: SelectedDecks = { ...selected };
    const fallback =
        decksCache[0]?.id ||
        SEED_DECK_FUMEURS_ID;
    if (selected['0'] === id) {
        next['0'] = fallback;
        changed = true;
    }
    if (selected['1'] === id) {
        next['1'] =
            decksCache.find((d) => d.id !== next['0'])?.id ||
            decksCache[0]?.id ||
            SEED_DECK_GONDOR_ID;
        changed = true;
    }
    if (changed) setSelectedDeckIds(next);
}

export async function duplicateDeck(
    id: string
): Promise<DeckConfig | undefined> {
    const source = await getDeckById(id);
    if (!source) return undefined;
    const copy = cloneDeck(source, `deck-${Date.now()}`, `${source.name} (copie)`);
    await saveDeck(copy);
    return copy;
}

export async function createEmptyDeck(
    name = 'Nouveau deck'
): Promise<DeckConfig> {
    const created = await apiJson<{ deck: DeckConfig }>('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    const deck = cloneDeck(created.deck);
    if (!decksCache) decksCache = [deck];
    else decksCache.push(deck);
    return deck;
}

export function getSelectedDeckIds(): SelectedDecks {
    if (typeof localStorage === 'undefined') {
        return { '0': SEED_DECK_FUMEURS_ID, '1': SEED_DECK_GONDOR_ID };
    }
    try {
        const raw = localStorage.getItem(SELECTED_KEY);
        if (!raw) {
            return { '0': SEED_DECK_FUMEURS_ID, '1': SEED_DECK_GONDOR_ID };
        }
        const parsed = JSON.parse(raw) as SelectedDecks;
        return {
            '0': mapLegacyId(parsed['0'] || SEED_DECK_FUMEURS_ID),
            '1': mapLegacyId(parsed['1'] || SEED_DECK_GONDOR_ID),
        };
    } catch {
        return { '0': SEED_DECK_FUMEURS_ID, '1': SEED_DECK_GONDOR_ID };
    }
}

export function setSelectedDeckIds(selected: SelectedDecks): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SELECTED_KEY, JSON.stringify(selected));
}

export function assignDeckToPlayer(
    playerId: '0' | '1',
    deckId: string
): void {
    const selected = getSelectedDeckIds();
    selected[playerId] = deckId;
    setSelectedDeckIds(selected);
}

/**
 * Deck pour créer une partie (async — lit le cache / API).
 * Le contenu part ensuite dans setupData.
 */
export async function loadDeckForPlayer(
    playerId: string
): Promise<DeckConfig> {
    const selected = getSelectedDeckIds();
    const key = playerId === '1' ? '1' : '0';
    const id = selected[key];
    const deck = await getDeckById(id);
    if (deck) return deck;
    const seeds = getSeedDecks();
    return key === '1' ? seeds[1]! : seeds[0]!;
}

/**
 * Fallback sync pour setupGame sans setupData (serveur / partie par défaut).
 * Seeds uniquement — les decks custom passent par setupData.
 */
export function loadSeedDeckForPlayer(playerId: string): DeckConfig {
    const seeds = getSeedDecks();
    return playerId === '1' ? seeds[1]! : seeds[0]!;
}
