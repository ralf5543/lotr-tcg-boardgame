import type { DeckConfig } from '../../decks/types';

const FLAG_KEY = 'lotr.botMatch';
const DECKS_KEY = 'lotr.botSetupDecks';
const PROFILES_KEY = 'lotr.botSetupProfiles';

export type BotMatchDecks = {
    '0': DeckConfig;
    '1': DeckConfig;
};

export type BotMatchProfile = {
    name?: string;
    avatar?: string;
};

export type BotMatchProfiles = Partial<
    Record<'0' | '1', BotMatchProfile>
>;

function canUseSessionStorage(): boolean {
    return typeof sessionStorage !== 'undefined';
}

/** Avant navigation vers `?bot=1` : decks pour le setup Local (pas de setupData). */
export function stashBotMatchDecks(decks: BotMatchDecks): void {
    if (!canUseSessionStorage()) return;
    sessionStorage.setItem(FLAG_KEY, '1');
    sessionStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

/** Profils hôte / BOT pour le setup Local. */
export function stashBotMatchProfiles(profiles: BotMatchProfiles): void {
    if (!canUseSessionStorage()) return;
    sessionStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
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

export function peekBotMatchProfiles(): BotMatchProfiles | null {
    if (!isBotMatchPending()) return null;
    try {
        const raw = sessionStorage.getItem(PROFILES_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as BotMatchProfiles;
    } catch {
        return null;
    }
}

export function clearBotMatchDecks(): void {
    if (!canUseSessionStorage()) return;
    sessionStorage.removeItem(FLAG_KEY);
    sessionStorage.removeItem(DECKS_KEY);
    sessionStorage.removeItem(PROFILES_KEY);
}

export function isBotMatchFromUrl(
    search: string = typeof window !== 'undefined' ? window.location.search : ''
): boolean {
    return new URLSearchParams(search).get('bot') === '1';
}
