import { getGameServerUrl } from '../config/gameServer';
import {
    defaultAvatarForSeat,
    fallbackSeatName,
    sessionProfileForSetup,
} from '../session/playerProfile';
import { joinMatchSeat, type JoinedMatch } from '../match/joinMatch';
import { loadDeckForPlayer } from './deckStorage';

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
 * Crée une partie SocketIO, rejoint le siège 0 (credentials),
 * puis renvoie match + siège pour l’URL.
 */
export async function createMatchWithSelectedDecks(): Promise<JoinedMatch> {
    const decks = {
        '0': await loadDeckForPlayer('0'),
        '1': await loadDeckForPlayer('1'),
    };

    const host = sessionProfileForSetup();
    const profiles = {
        '0': {
            name: host.name || fallbackSeatName('0'),
            avatar: host.avatar,
        },
        // Siège 1 : encore le deck local du créateur (Phase 1) ;
        // le profil adverse arrive en étape 4 (antichambre).
        '1': {
            name: fallbackSeatName('1'),
            avatar: defaultAvatarForSeat('1').path,
        },
    };

    const server = getGameServerUrl();
    const res = await fetch(`${server}/games/lotr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            numPlayers: 2,
            setupData: { decks, profiles },
            // Privé : pas listé dans GET /games/lotr (code à partager).
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

    // Siège hôte protégé immédiatement.
    return joinMatchSeat(body.matchID, '0');
}
