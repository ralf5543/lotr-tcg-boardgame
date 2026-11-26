import { getGameServerUrl } from '../config/gameServer';
import {
    fallbackSeatName,
    sessionProfileForSetup,
} from '../session/playerProfile';
import { joinMatchSeat, type JoinedMatch } from '../match/joinMatch';
import { stashPendingLoadout } from '../match/pendingLoadout';
import { loadDeckForPlayer } from './deckStorage';
import type { DeckConfig } from './types';

export type { JoinedMatch } from '../match/joinMatch';

export type MatchCreateErrorCode = 'SERVER_FULL' | 'HTTP' | 'NO_MATCH_ID';

export class MatchCreateError extends Error {
    readonly code: MatchCreateErrorCode;

    constructor(code: MatchCreateErrorCode, message: string) {
        super(message);
        this.name = 'MatchCreateError';
        this.code = code;
    }
}

/**
 * Crée une partie en antichambre : deck + profil de l’hôte seulement.
 * L’invité enverra les siens via readyWithLoadout.
 */
export async function createMatchWithSelectedDecks(
    hostDeck?: DeckConfig
): Promise<JoinedMatch> {
    const deck = hostDeck ?? (await loadDeckForPlayer('0'));
    const host = sessionProfileForSetup();
    const profiles = {
        '0': {
            name: host.name || fallbackSeatName('0'),
            avatar: host.avatar,
        },
    };

    const server = getGameServerUrl();
    const res = await fetch(`${server}/games/lotr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            numPlayers: 2,
            setupData: {
                antichamber: true,
                decks: { '0': deck },
                profiles,
            },
            unlisted: true,
        }),
    });

    if (!res.ok) {
        let body: unknown = null;
        try {
            body = await res.json();
        } catch {
            /* ignore */
        }
        const errorCode =
            body &&
            typeof body === 'object' &&
            'error' in body &&
            typeof (body as { error: unknown }).error === 'string'
                ? (body as { error: string }).error
                : '';

        if (res.status === 503 || errorCode === 'SERVER_FULL') {
            throw new MatchCreateError(
                'SERVER_FULL',
                'Serveur plein (trop de parties actives).'
            );
        }

        throw new MatchCreateError(
            'HTTP',
            `Création de partie impossible : ${res.status}`
        );
    }

    const body = (await res.json()) as { matchID?: string };
    if (!body.matchID) {
        throw new MatchCreateError(
            'NO_MATCH_ID',
            'Réponse serveur sans matchID.'
        );
    }

    return joinMatchSeat(body.matchID, '0');
}

/** Avant navigation invité : mémoriser le deck à poser en antichambre. */
export async function prepareGuestLoadout(deck?: DeckConfig): Promise<void> {
    const d = deck ?? (await loadDeckForPlayer('0'));
    stashPendingLoadout(d);
}
