import { getGameServerUrl } from '../config/gameServer';
import {
    fallbackSeatName,
    loadSessionProfile,
} from '../session/playerProfile';
import { saveMatchCredentials } from '../session/matchCredentials';

export type JoinedMatch = {
    matchID: string;
    playerID: string;
    credentials: string;
};

export type MatchJoinErrorCode =
    | 'HTTP'
    | 'NO_CREDENTIALS'
    | 'SEAT_TAKEN'
    | 'MATCH_FULL'
    | 'NOT_FOUND';

export class MatchJoinError extends Error {
    readonly code: MatchJoinErrorCode;

    constructor(code: MatchJoinErrorCode, message: string) {
        super(message);
        this.name = 'MatchJoinError';
        this.code = code;
    }
}

/**
 * Rejoint un siège boardgame.io et stocke les credentials locaux.
 * `playerID` omis → premier siège libre.
 */
export async function joinMatchSeat(
    matchID: string,
    playerID?: string
): Promise<JoinedMatch> {
    const session = loadSessionProfile();
    const playerName = session.name || fallbackSeatName(playerID ?? '0');

    const server = getGameServerUrl();
    // Sans playerID : premier siège libre (invité = 1 si l’hôte a déjà pris 0).
    // OK en local à 2 onglets : le localStorage partagé garde les deux jetons.
    const body: Record<string, string> = { playerName };
    if (playerID != null && playerID !== '') {
        body.playerID = playerID;
    }

    const res = await fetch(
        `${server}/games/lotr/${encodeURIComponent(matchID)}/join`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );

    if (!res.ok) {
        let message = `Join impossible : ${res.status}`;
        try {
            const text = await res.text();
            if (text) message = text;
        } catch {
            /* ignore */
        }

        if (res.status === 404) {
            throw new MatchJoinError('NOT_FOUND', message);
        }
        if (res.status === 409) {
            const full = /maximum number of players/i.test(message);
            throw new MatchJoinError(
                full ? 'MATCH_FULL' : 'SEAT_TAKEN',
                message
            );
        }
        throw new MatchJoinError('HTTP', message);
    }

    const data = (await res.json()) as {
        playerID?: string;
        playerCredentials?: string;
    };

    if (!data.playerID || !data.playerCredentials) {
        throw new MatchJoinError(
            'NO_CREDENTIALS',
            'Réponse join sans credentials.'
        );
    }

    saveMatchCredentials(matchID, data.playerID, data.playerCredentials);

    return {
        matchID,
        playerID: data.playerID,
        credentials: data.playerCredentials,
    };
}
