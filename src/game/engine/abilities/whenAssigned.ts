import type { CardState, GameState } from '../../types';
import { applyAbilityEffect } from './applyAbilityEffect';

/**
 * À l’affectation FP d’un séide : effets WHEN_ASSIGNED (Mad Thing : +3 force
 * jusqu’au regroupement, sans toaster — choix fardeau reporté).
 */
export function resolveWhenAssigned(
    G: GameState,
    card: CardState,
    by: 'FREE_PEOPLE'
): void {
    for (const ability of card.abilities || []) {
        if (ability.trigger?.type !== 'WHEN_ASSIGNED') continue;
        if (ability.trigger.by !== by) continue;
        applyAbilityEffect(G, card, ability);
    }
}
