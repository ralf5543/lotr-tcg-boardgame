import { getGameServerUrl } from '../config/gameServer';
import { clearMatchCredentials } from '../session/matchCredentials';
import type { JoinedMatch } from './joinMatch';

/**
 * Quitte un siège. Si plus personne n’est nommé dans le lobby,
 * boardgame.io wipe la partie (le code devient inutilisable).
 */
export async function leaveMatchSeat(
    matchID: string,
    playerID: string,
    credentials: string,
    opts?: { keepalive?: boolean }
): Promise<void> {
    const server = getGameServerUrl();
    try {
        await fetch(
            `${server}/games/lotr/${encodeURIComponent(matchID)}/leave`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerID, credentials }),
                keepalive: opts?.keepalive === true,
            }
        );
    } catch {
        /* best effort — onglet qui se ferme, réseau coupé… */
    }
    clearMatchCredentials(matchID, playerID);
}

/** Hôte quitte l’attente → leave siège 0 → wipe si seul. */
export async function cancelHostWaitingMatch(
    host: JoinedMatch,
    opts?: { keepalive?: boolean }
): Promise<void> {
    await leaveMatchSeat(
        host.matchID,
        host.playerID,
        host.credentials,
        opts
    );
}
