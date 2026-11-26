import { loadDeckForPlayer } from '../decks/deckStorage';
import type { DeckConfig } from '../decks/types';
import { validateDeck } from '../decks/validateDeck';
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

export type SubmitLobbyResult =
    | { ok: true }
    | { ok: false; error: string };

/** Envoie readyWithLoadout avec le profil de session courant. */
export async function submitLobbyLoadout(
    readyWithLoadout: ReadyMove | undefined
): Promise<SubmitLobbyResult> {
    if (!readyWithLoadout) {
        return {
            ok: false,
            error: 'Coup d’antichambre indisponible (rechargez la page).',
        };
    }
    const deck = await resolveLobbyDeck();
    const validation = validateDeck(deck);
    if (!validation.ok) {
        const detail =
            validation.errors?.[0]?.message ||
            'Deck invalide pour le format Standard.';
        return { ok: false, error: detail };
    }
    readyWithLoadout(deck, sessionProfileForSetup());
    return { ok: true };
}
