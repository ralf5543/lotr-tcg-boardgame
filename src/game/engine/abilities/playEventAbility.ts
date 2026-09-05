import type { Ability, CardState, GameState } from '../../types';
import { abilityMatchesPhase } from './collectAbilities';
import { applyAbilityEffect } from './applyAbilityEffect';
import { canPayAbilityCost, payAbilityCost } from './payAbilityCost';

export function findEventAbilityForPhase(
    card: CardState,
    rawPhase: string
): Ability | undefined {
    if (card.type !== 'EVENT' || !card.abilities?.length) return undefined;
    return card.abilities.find((ability) =>
        abilityMatchesPhase(ability, rawPhase)
    );
}

/**
 * Événement depuis la main : le texte parsé est le coût / effet du play,
 * pas une capacité « déjà en jeu ».
 */
export function canPayEventAbility(
    G: GameState,
    card: CardState,
    rawPhase: string
): { valid: boolean; reason?: string } {
    if (card.type !== 'EVENT' || !card.abilities?.length) {
        return { valid: true };
    }

    const ability = findEventAbilityForPhase(card, rawPhase);
    if (!ability) {
        return {
            valid: false,
            reason: 'Aucune capacité de cet événement ne correspond à la phase actuelle.',
        };
    }

    if (!canPayAbilityCost(G, card, ability.cost)) {
        return {
            valid: false,
            reason: 'Le coût de cet événement ne peut pas être payé.',
        };
    }

    return { valid: true };
}

export function applyEventAbility(
    G: GameState,
    card: CardState,
    rawPhase: string,
    chosenTargetId?: string
): boolean {
    if (card.type !== 'EVENT' || !card.abilities?.length) return true;

    const ability = findEventAbilityForPhase(card, rawPhase);
    if (!ability) return false;
    if (!payAbilityCost(G, card, ability.cost, chosenTargetId)) return false;
    return applyAbilityEffect(G, card, ability, chosenTargetId);
}
