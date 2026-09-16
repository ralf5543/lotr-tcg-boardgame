import type { Ability, GameState, SiteCardState } from '../../types';

function isSiteMoveTrigger(
    ability: Ability,
    direction: 'MOVES_TO' | 'MOVES_FROM'
): boolean {
    return ability.trigger?.type === direction;
}

/**
 * Applique les abilities site déclenchées par un déplacement (fragments sûrs).
 * Uniquement add/remove twilight fixe, sans coût ni optionnel.
 */
export function resolveSiteMoveAbilities(
    G: GameState,
    site: SiteCardState | null | undefined,
    direction: 'MOVES_TO' | 'MOVES_FROM'
): void {
    if (!site?.abilities?.length) return;

    for (const ability of site.abilities) {
        if (!isSiteMoveTrigger(ability, direction)) continue;
        if (ability.optional) continue;
        if ((ability.cost || []).length > 0) continue;

        for (const effect of ability.effects || []) {
            if (effect.type === 'ADD_TWILIGHT') {
                G.twilightPool = (G.twilightPool || 0) + (effect.count || 0);
                continue;
            }
            if (effect.type === 'REMOVE_TWILIGHT' && !effect.countFromSpot) {
                G.twilightPool = Math.max(
                    0,
                    (G.twilightPool || 0) - (effect.count || 0)
                );
            }
        }
    }
}
