import type { DeckConfig } from '../../decks/types';

const FLAG_KEY = 'lotr.botMatch';
const DECKS_KEY = 'lotr.botSetupDecks';

export type BotMatchDecks = {
    '0': DeckConfig;
    '1': DeckConfig;
};

function canUseSessionStorage(): boolean {
    return typeof sessionStorage !== 'undefined';
}

/** Avant navigation vers `?bot=1` : decks pour le setup Local (pas de setupData). */
export function stashBotMatchDecks(decks: BotMatchDecks): void {
    if (!canUseSessionStorage()) return;
    sessionStorage.setItem(FLAG_KEY, '1');
    sessionStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function isBotMatchPending(): boolean {
    if (!canUseSessionStorage()) return false;
    return sessionStorage.getItem(FLAG_KEY) === '1';
}

export function peekBotMatchDecks(): BotMatchDecks | null {
    if (!isBotMatchPending()) return null;
    try {
        const raw = sessionStorage.getItem(DECKS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as BotMatchDecks;
        if (!parsed?.['0'] || !parsed?.['1']) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearBotMatchDecks(): void {
    if (!canUseSessionStorage()) return;
    sessionStorage.removeItem(FLAG_KEY);
    sessionStorage.removeItem(DECKS_KEY);
}

export function isBotMatchFromUrl(
    search: string = typeof window !== 'undefined' ? window.location.search : ''
): boolean {
    return new URLSearchParams(search).get('bot') === '1';
}
