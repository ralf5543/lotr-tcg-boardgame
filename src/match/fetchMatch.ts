import { getGameServerUrl } from '../config/gameServer';

export type MatchPlayerMeta = {
    id: number | string;
    name?: string | null;
};

export type MatchMeta = {
    matchID: string;
    players: MatchPlayerMeta[];
};

/** Métadonnées publiques d’une partie (sans credentials). */
export async function fetchMatchMeta(matchID: string): Promise<MatchMeta> {
    const server = getGameServerUrl();
    const res = await fetch(
        `${server}/games/lotr/${encodeURIComponent(matchID)}`
    );
    if (!res.ok) {
        throw new Error(`Match introuvable (${res.status})`);
    }
    return (await res.json()) as MatchMeta;
}

/** L’adversaire (siège 1) a rejoint = un `name` est posé côté lobby. */
export function matchHasGuest(meta: MatchMeta): boolean {
    const guest = meta.players.find((p) => String(p.id) === '1');
    return Boolean(guest?.name?.trim());
}
