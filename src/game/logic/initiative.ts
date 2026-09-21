import type { GameState } from '../types';

/**
 * Initiative (King block) : le FP l’a s’il a ≥ 4 cartes en main ;
 * sinon l’Ombre l’a.
 */
export function freePeoplesHasInitiative(G: GameState): boolean {
    const fpId = G.fpPlayerId || '0';
    return (G.players[fpId]?.hand?.length || 0) >= 4;
}

export function playerHasInitiative(
    G: GameState,
    playerId: string
): boolean {
    const fpId = G.fpPlayerId || '0';
    const fpHas = freePeoplesHasInitiative(G);
    return String(playerId) === String(fpId) ? fpHas : !fpHas;
}
