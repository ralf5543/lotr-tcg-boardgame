import type { Ability, CardState, GameState } from '../../types';
import {
    isCardStackedOnControlledSite,
} from '../../logic/sites';
import { abilityOwnerPlayerId } from './payAbilityCost';
import {
    isSkirmishActionForbidden,
    isSkirmishSpecialAbility,
} from '../../logic/skirmishActionRestrictions';

export function isAssignedToSkirmish(
    G: GameState,
    card: CardState
): boolean {
    const id = card.instanceId || card.id;
    if (!id) return false;
    return (G.skirmishes || []).some((skirmish) => {
        if (skirmish.companionId === id) return true;
        if (skirmish.minionIds?.some((mid) => mid === id)) return true;
        if (skirmish.minionId === id) return true;
        return false;
    });
}

/** Restrictions hors coût / cible (ex. « not assigned to a skirmish »). */
export function abilityMeetsPlayRestrictions(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    if (ability.requiresUnassigned && isAssignedToSkirmish(G, source)) {
        return false;
    }
    if (ability.requiresStackedOnControlledSite) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        if (!isCardStackedOnControlledSite(G, source, ownerId)) return false;
    } else if (
        (ability.effects || []).some((e) => e.type === 'STACK_ON_CONTROLLED_SITE')
    ) {
        // Empiler : carte encore en jeu, pas déjà empilée
        if (findStacked(G, source)) return false;
    }
    if (isSkirmishSpecialAbility(ability)) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (
            ownerId &&
            isSkirmishActionForbidden(G, ownerId, 'SPECIAL_ABILITY')
        ) {
            return false;
        }
    }
    return true;
}

function findStacked(G: GameState, source: CardState): boolean {
    const id = source.instanceId || source.id;
    return (G.path || []).some((site) =>
        (site?.stacked || []).some(
            (c) => c && (c.instanceId === id || c.id === id)
        )
    );
}
