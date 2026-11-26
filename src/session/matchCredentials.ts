/**
 * Credentials boardgame.io par siège (Phase 2 étape 2).
 * Clé locale : matchID + playerID — survit au rechargement.
 */

const STORAGE_KEY = 'lotr.matchCredentials';

export type StoredMatchSeat = {
    matchID: string;
    playerID: string;
    credentials: string;
};

type StoreMap = Record<string, { credentials: string }>;

function seatKey(matchID: string, playerID: string): string {
    return `${matchID}::${playerID}`;
}

function readStore(): StoreMap {
    if (typeof localStorage === 'undefined') return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed as StoreMap;
    } catch {
        return {};
    }
}

function writeStore(store: StoreMap): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        /* quota / mode privé */
    }
}

export function saveMatchCredentials(
    matchID: string,
    playerID: string,
    credentials: string
): void {
    if (!matchID || !playerID || !credentials) return;
    const store = readStore();
    store[seatKey(matchID, playerID)] = { credentials };
    writeStore(store);
}

export function loadMatchCredentials(
    matchID: string,
    playerID: string
): string | null {
    if (!matchID || !playerID) return null;
    const entry = readStore()[seatKey(matchID, playerID)];
    const cred = entry?.credentials?.trim();
    return cred || null;
}

export function clearMatchCredentials(
    matchID: string,
    playerID?: string
): void {
    const store = readStore();
    if (playerID) {
        delete store[seatKey(matchID, playerID)];
    } else {
        for (const key of Object.keys(store)) {
            if (key.startsWith(`${matchID}::`)) delete store[key];
        }
    }
    writeStore(store);
}
