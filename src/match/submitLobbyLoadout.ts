import { loadDeckForPlayer } from '../decks/deckStorage';
import type { DeckConfig } from '../decks/types';
import { sessionProfileForSetup } from '../session/playerProfile';
import { peekPendingLoadout } from './pendingLoadout';

/** Deck à poser en antichambre (stash invité, sinon sélection locale). */
export async function resolveLobbyDeck(): Promise<DeckConfig> {
    return peekPendingLoadout() ?? (await loadDeckForPlayer('0'));
}

type ReadyMove = (
    deck: DeckConfig,
    profile?: { name?: string; avatar?: string }
) => void;

/** Envoie readyWithLoadout avec le profil de session courant. */
export async function submitLobbyLoadout(
    readyWithLoadout: ReadyMove | undefined
): Promise<boolean> {
    if (!readyWithLoadout) return false;
    const deck = await resolveLobbyDeck();
    readyWithLoadout(deck, sessionProfileForSetup());
    return true;
}
