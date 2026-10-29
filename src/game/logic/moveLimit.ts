import type { AbilityEffect, CardState, GameState } from '../types';
import { forEachInPlayCard } from '../engine/abilities/resolveCostTarget';
import { whileConditionHolds } from './stats/mechanics/whileModifier';

/** Limite de déplacement de base (Comprehensive Rules). */
export const BASE_MOVE_LIMIT = 2;

function forEachSiteAttachment(
    G: GameState,
    visit: (card: CardState) => void
): void {
    for (const site of G.path || []) {
        if (!site) continue;
        for (const att of site.attachments || []) {
            if (att) visit(att);
        }
    }
}

/**
 * Limite de déplacement effective ce tour (min 1).
 * Passifs While `MODIFY_MOVE_LIMIT` (Voix du Traître…).
 */
export function getMoveLimit(G: GameState): number {
    let delta = 0;
    let floor = 1;

    const visit = (source: CardState) => {
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'MODIFY_MOVE_LIMIT') continue;
                delta += effect.value || 0;
                if (typeof effect.min === 'number') {
                    floor = Math.max(floor, effect.min);
                }
            }
        }
    };

    forEachInPlayCard(G, visit);
    forEachSiteAttachment(G, visit);

    return Math.max(floor, BASE_MOVE_LIMIT + delta);
}

export function movesRemainThisTurn(G: GameState): boolean {
    return (G.movesThisTurn || 0) < getMoveLimit(G);
}

/** Garde TypeScript pour les effets collectés. */
export function isModifyMoveLimitEffect(
    effect: AbilityEffect
): effect is Extract<AbilityEffect, { type: 'MODIFY_MOVE_LIMIT' }> {
    return effect.type === 'MODIFY_MOVE_LIMIT';
}
