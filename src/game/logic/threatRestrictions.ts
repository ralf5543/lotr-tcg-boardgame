import type { CardState, GameState } from '../types';
import { forEachInPlayCard } from '../engine/abilities/resolveCostTarget';
import { whileConditionHolds } from './stats/mechanics/whileModifier';

/**
 * Rallying Call : une carte Peuples Libres ne peut pas retirer de menaces
 * tant qu’un passif FORBID_REMOVE_THREATS (by FP cards) est en jeu.
 */
export function areThreatRemovalsForbiddenForFpCard(
    G: GameState,
    source: CardState | null | undefined
): boolean {
    if (!source || source.kind !== 'FREE_PEOPLE') return false;

    let forbidden = false;
    forEachInPlayCard(G, (card) => {
        if (forbidden) return;
        for (const ability of card.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, card, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'FORBID_REMOVE_THREATS') continue;
                if (effect.by !== 'FREE_PEOPLE_CARDS') continue;
                forbidden = true;
                return;
            }
        }
    });
    return forbidden;
}
