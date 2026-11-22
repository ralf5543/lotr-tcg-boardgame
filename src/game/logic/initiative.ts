import type { CardState, GameState } from '../types';
import { setStatus } from '../../i18n/status';
import { maybeOfferLoseInitiativeResponse } from '../engine/abilities/loseInitiative';

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
    setStatus(G, hasNow ? 'INITIATIVE_GAINED' : 'INITIATIVE_LOST');
    if (hadBefore && !hasNow) {
        maybeOfferLoseInitiativeResponse(G);
    }
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

/**
 * Mutation de la main d’un joueur : n’annonce que si c’est le camp FP
 * (l’initiative ne dépend que de sa main).
 */
export function withFpHandChange(
    G: GameState,
    ownerId: string | null | undefined,
    mutate: () => void
): void {
    const fpId = G.fpPlayerId || '0';
    const watch =
        ownerId != null && String(ownerId) === String(fpId);
    const before = watch ? freePeoplesHasInitiative(G) : false;
    mutate();
    if (watch) announceInitiativeIfChanged(G, before);
}

/** Ajoute une carte en main (+ initiative si FP). */
export function addCardToPlayerHand(
    G: GameState,
    ownerId: string,
    card: CardState
): void {
    withFpHandChange(G, ownerId, () => {
        const player = G.players[ownerId];
        if (!player) return;
        if (!player.hand) player.hand = [];
        player.hand.push(card);
    });
}
