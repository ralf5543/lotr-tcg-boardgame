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

/** Annonce dans le bandeau si l’initiative FP a basculé. */
export function announceInitiativeIfChanged(
    G: GameState,
    hadBefore: boolean
): void {
    const hasNow = freePeoplesHasInitiative(G);
    if (hasNow === hadBefore) return;
    G.statusMessage = hasNow
        ? 'Les Peuples Libres gagnent l’initiative.'
        : 'Les Peuples Libres perdent l’initiative.';
}

/**
 * Exécute une mutation qui peut changer la main FP, puis annonce
 * un éventuel basculement d’initiative.
 */
export function withInitiativeWatch(G: GameState, run: () => void): void {
    const before = freePeoplesHasInitiative(G);
    run();
    announceInitiativeIfChanged(G, before);
}
