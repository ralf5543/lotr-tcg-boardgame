import {
    stashBotMatchDecks,
    stashBotMatchProfiles,
} from '../game/bot/botMatchSetup';
import {
    defaultAvatarForSeat,
    fallbackSeatName,
    sessionProfileForSetup,
} from '../session/playerProfile';
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
    const host = sessionProfileForSetup();
    stashBotMatchDecks(decks);
    stashBotMatchProfiles({
        '0': {
            name: host.name || fallbackSeatName('0'),
            avatar: host.avatar,
        },
        '1': {
            name: 'BOT',
            avatar: defaultAvatarForSeat('1').path,
        },
    });
    return `bot-${Date.now()}`;
}
