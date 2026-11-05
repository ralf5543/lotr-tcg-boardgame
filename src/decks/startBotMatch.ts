import { stashBotMatchDecks } from '../game/bot/botMatchSetup';
import { loadDeckForPlayer } from './deckStorage';

/**
 * Prépare un match solo Local vs BOT (siège 1) :
 * stash des decks + id de match pour l’URL `?bot=1&player=0`.
 */
export async function prepareBotMatch(): Promise<string> {
    const decks = {
        '0': await loadDeckForPlayer('0'),
        '1': await loadDeckForPlayer('1'),
    };
    stashBotMatchDecks(decks);
    return `bot-${Date.now()}`;
}
