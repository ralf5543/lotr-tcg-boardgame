import type { CardState, GameState } from '../../types';
import { applyAbilityEffect } from './applyAbilityEffect';
import { forEachInPlayCard } from './resolveCostTarget';
import { cardMatchesTarget } from '../validations/matchers';
import { applyExert } from '../../../utils/applyExert';

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

/**
 * Unferth : chaque fois que le FP assigne un compagnon/allié à un séide
 * matchant, ce personnage doit s’affaiblir.
 */
export function resolveWhenFpAssignsTo(
    G: GameState,
    companion: CardState,
    minion: CardState
): void {
    forEachInPlayCard(G, (card) => {
        for (const ability of card.abilities || []) {
            if (ability.trigger?.type !== 'WHEN_FP_ASSIGNS_TO') continue;
            if (!cardMatchesTarget(minion, ability.trigger.to)) continue;
            applyExert(G, companion);
        }
    });
}
