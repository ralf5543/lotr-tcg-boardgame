import type { Ability, CardState, GameState } from '../../types';

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
    return true;
}
