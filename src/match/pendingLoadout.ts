import type { DeckConfig } from '../decks/types';

const KEY = 'lotr.pendingLoadout';

/** Deck à envoyer via readyWithLoadout à l’entrée en antichambre. */
export function stashPendingLoadout(deck: DeckConfig): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(KEY, JSON.stringify(deck));
    } catch {
        /* ignore */
    }
}

export function peekPendingLoadout(): DeckConfig | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        return JSON.parse(raw) as DeckConfig;
    } catch {
        return null;
    }
}

export function clearPendingLoadout(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(KEY);
}
