import type { Ability, CardState, GameState } from '../../types';
import { abilityMatchesPhase } from './collectAbilities';
import { applyAbilityEffect } from './applyAbilityEffect';
import { canPayAbilityCost, payAbilityCost } from './payAbilityCost';
import {
    abilityHasLegalEffectTarget,
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    costAndEffectShareHandDesignation,
} from './designation';
import { isResponseWindowOpen } from '../responseWindow';

function abilityPhaseToMatch(G: GameState, rawPhase: string): string {
    return isResponseWindowOpen(G) ? 'RESPONSE' : rawPhase;
}

function eventAbilityMatchesPhase(
    card: CardState,
    ability: Ability,
    rawPhase: string
): boolean {
    if (ability.phases?.length) {
        return abilityMatchesPhase(ability, rawPhase);
    }
    if (card.phases?.length) {
        return abilityMatchesPhase(
            { ...ability, phases: card.phases },
            rawPhase
        );
    }
    return true;
}

export function findEventAbilityForPhase(
    card: CardState,
    rawPhase: string
): Ability | undefined {
    if (card.type !== 'EVENT' || !card.abilities?.length) return undefined;
    return card.abilities.find((ability) =>
        eventAbilityMatchesPhase(card, ability, rawPhase)
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
    if (card.type !== 'EVENT') {
        return { valid: true };
    }
    if (!card.abilities?.length) {
        return {
            valid: false,
            reason: 'Cet événement n’a pas d’effet connu.',
        };
    }

    const ability = findEventAbilityForPhase(
        card,
        abilityPhaseToMatch(G, rawPhase)
    );
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

    if (!abilityHasLegalEffectTarget(G, card, ability)) {
        return {
            valid: false,
            reason: 'Aucune cible valide pour cet événement.',
        };
    }

    return { valid: true };
}

export function applyEventAbility(
    G: GameState,
    card: CardState,
    rawPhase: string,
    chosenTargetId?: string | string[]
): boolean {
    if (card.type !== 'EVENT') return true;
    if (!card.abilities?.length) return false;

    const ability = findEventAbilityForPhase(
        card,
        abilityPhaseToMatch(G, rawPhase)
    );
    if (!ability) return false;

    const needsCost = abilityNeedsCostDesignation(G, card, ability);
    const needsEffect = abilityNeedsEffectDesignation(G, card, ability);
    const ids = Array.isArray(chosenTargetId)
        ? chosenTargetId
        : chosenTargetId
          ? [chosenTargetId]
          : [];

    // Coût désigné + effet désigné
    if (needsCost && needsEffect) {
        // Même filtre (Hobbit → Hobbit) : une seule id pour les deux
        if (costAndEffectShareHandDesignation(ability)) {
            const sharedId = ids[0];
            if (!sharedId) return false;
            if (!payAbilityCost(G, card, ability.cost, sharedId)) return false;
            return applyAbilityEffect(G, card, ability, sharedId);
        }
        // Filtres distincts (ranger → séide) : [costId, effectId]
        const costTargetId = ids[0];
        const effectTargetId = ids[1];
        if (!costTargetId || !effectTargetId) return false;
        if (!payAbilityCost(G, card, ability.cost, costTargetId)) return false;
        return applyAbilityEffect(G, card, ability, effectTargetId);
    }

    // Coût seul / effet seul / replace REGION ([path, deck]) / pas de cible
    const costTargetId = ids[0];
    if (!payAbilityCost(G, card, ability.cost, costTargetId)) return false;
    return applyAbilityEffect(G, card, ability, chosenTargetId);
}
