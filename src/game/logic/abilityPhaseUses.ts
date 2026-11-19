import type { Ability, CardState, GameState } from '../types';

function useKey(source: CardState, ability: Ability): string {
    return `${source.instanceId || source.id}::${ability.id}`;
}

/** Remise à zéro en début de phase (via `appendPhaseJournal`). */
export function clearAbilityPhaseUses(G: GameState): void {
    G.abilityUsesThisPhase = {};
}

export function getAbilityUsesThisPhase(
    G: GameState,
    source: CardState,
    ability: Ability
): number {
    return G.abilityUsesThisPhase?.[useKey(source, ability)] || 0;
}

/** True si la capacité n’a pas de limite, ou si elle n’est pas encore atteinte. */
export function abilityWithinPhaseLimit(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    const limit = ability.limitPerPhase;
    if (!limit || limit <= 0) return true;
    return getAbilityUsesThisPhase(G, source, ability) < limit;
}

/** Compte un usage (après paiement du coût / engagement de la capacité). */
export function recordAbilityUseThisPhase(
    G: GameState,
    source: CardState,
    ability: Ability
): void {
    if (!ability.limitPerPhase || ability.limitPerPhase <= 0) return;
    const key = useKey(source, ability);
    if (!G.abilityUsesThisPhase) G.abilityUsesThisPhase = {};
    G.abilityUsesThisPhase[key] = (G.abilityUsesThisPhase[key] || 0) + 1;
}
