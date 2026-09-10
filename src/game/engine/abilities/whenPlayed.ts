import type { Ability, CardState, GameState } from '../../types';
import { applyAbilityEffect } from './applyAbilityEffect';
import { canPayAbilityCost, payAbilityCost } from './payAbilityCost';

export function isWhenPlayedAbility(ability: Ability): boolean {
    return ability.trigger?.type === 'WHEN_PLAYED';
}

/** Actions requises « When you play this » : si le coût est payable, on les applique. */
export function resolveWhenPlayed(G: GameState, card: CardState): void {
    for (const ability of card.abilities || []) {
        if (!isWhenPlayedAbility(ability)) continue;
        if (!canPayAbilityCost(G, card, ability.cost)) continue;
        if (!payAbilityCost(G, card, ability.cost)) continue;
        applyAbilityEffect(G, card, ability);
    }
}
