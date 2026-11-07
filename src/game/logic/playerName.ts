import type { GameState } from '../types';

/** Autre siège (2 joueurs). */
export function otherPlayerId(playerId: string): string {
    return String(playerId) === '0' ? '1' : '0';
}

/** Nom affiché — profil si dispo, sinon repli neutre. */
export function playerDisplayName(
    G: GameState,
    playerId: string | null | undefined
): string {
    if (playerId == null || playerId === '') return 'Joueur';
    const id = String(playerId);
    const name = G.players[id]?.profile?.name?.trim();
    return name || `Joueur ${id}`;
}
