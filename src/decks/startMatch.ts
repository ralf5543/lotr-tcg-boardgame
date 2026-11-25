import { getGameServerUrl } from '../config/gameServer';
import { loadDeckForPlayer } from './deckStorage';

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
 * Crée une partie SocketIO avec les decks sélectionnés (setupData),
 * puis renvoie l’id de match à mettre dans l’URL.
 */
export async function createMatchWithSelectedDecks(): Promise<string> {
    const decks = {
        '0': await loadDeckForPlayer('0'),
        '1': await loadDeckForPlayer('1'),
    };

    const server = getGameServerUrl();
    const res = await fetch(`${server}/games/lotr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            numPlayers: 2,
            setupData: { decks },
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
    return body.matchID;
}
