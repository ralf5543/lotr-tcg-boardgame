import type { Ability, CardState, GameState, SiteCardState } from '../../types';
import { discardCardFromPlay } from '../../../utils/discardCardFromPlay';
import { applyHeal } from '../../../utils/applyHeal';
import { applyExert } from '../../../utils/applyExert';
import { applyWoundAndCheckDeath } from '../../../utils/applyWoundAndCheckDeath';
import { getEffectiveResistance } from '../../../utils/cardStats';
import { getSiteRegion } from '../../logic/sites';
import { cardMatchesTarget } from '../validations/matchers';
import { forEachInPlayCard } from './resolveCostTarget';

function isSiteMoveTrigger(
    ability: Ability,
    direction: 'MOVES_TO' | 'MOVES_FROM'
): boolean {
    return ability.trigger?.type === direction;
}

function triggerConditionsMet(
    G: GameState,
    site: SiteCardState,
    ability: Ability
): boolean {
    const trigger = ability.trigger;
    if (!trigger || (trigger.type !== 'MOVES_TO' && trigger.type !== 'MOVES_FROM')) {
        return true;
    }
    if (trigger.duringRegroup && !G.regroupStep) {
        return false;
    }
    if (typeof trigger.siteRegion === 'number') {
        const siteNumber = site.siteNumber ?? 0;
        if (!siteNumber || getSiteRegion(siteNumber) !== trigger.siteRegion) {
            return false;
        }
    }
    return true;
}

function discardAllMatching(G: GameState, target: string[][]): void {
    const matches: CardState[] = [];
    forEachInPlayCard(G, (card) => {
        if (cardMatchesTarget(card, target)) matches.push(card);
    });
    for (const card of matches) {
        discardCardFromPlay(G, card);
    }
}

function countInPlayMatching(G: GameState, target: string[][]): number {
    let n = 0;
    forEachInPlayCard(G, (card) => {
        if (cardMatchesTarget(card, target)) n += 1;
    });
    return n;
}

function companionCount(G: GameState): number {
    const fpId = G.fpPlayerId || '0';
    return G.players[fpId]?.fellowshipArea?.length || 0;
}

function fpBurdens(G: GameState): number {
    const fpId = G.fpPlayerId || '0';
    return G.players[fpId]?.burdens || 0;
}

function collectMatchingCharacters(
    G: GameState,
    target: string[][],
    opts?: { minResistance?: number; maxResistance?: number }
): CardState[] {
    const burdens = fpBurdens(G);
    const matches: CardState[] = [];
    forEachInPlayCard(G, (card) => {
        if (card.type !== 'COMPANION' && card.type !== 'ALLY' && card.type !== 'MINION') {
            return;
        }
        if (!cardMatchesTarget(card, target)) return;
        const res = getEffectiveResistance(card, burdens);
        if (
            typeof opts?.minResistance === 'number' &&
            res < opts.minResistance
        ) {
            return;
        }
        if (
            typeof opts?.maxResistance === 'number' &&
            res > opts.maxResistance
        ) {
            return;
        }
        matches.push(card);
    });
    return matches;
}

/**
 * Applique les abilities site déclenchées par un déplacement (fragments sûrs).
 * Uniquement effets sans coût ni optionnel.
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
        if (!triggerConditionsMet(G, site, ability)) continue;

        for (const effect of ability.effects || []) {
            if (effect.type === 'ADD_TWILIGHT') {
                let amount = effect.count || 0;
                if (typeof effect.perCompanionOver === 'number') {
                    amount =
                        (effect.count || 0) *
                        Math.max(
                            0,
                            companionCount(G) - effect.perCompanionOver
                        );
                } else if (effect.perInPlay) {
                    amount =
                        (effect.count || 0) *
                        countInPlayMatching(G, effect.perInPlay);
                }
                if (amount > 0) {
                    G.twilightPool = (G.twilightPool || 0) + amount;
                }
                continue;
            }
            if (effect.type === 'REMOVE_TWILIGHT' && !effect.countFromSpot) {
                G.twilightPool = Math.max(
                    0,
                    (G.twilightPool || 0) - (effect.count || 0)
                );
                continue;
            }
            if (effect.type === 'DISCARD_ALL') {
                discardAllMatching(G, effect.target);
                continue;
            }
            if (effect.type === 'HEAL' && effect.all) {
                const targets = collectMatchingCharacters(
                    G,
                    effect.target as string[][],
                    { minResistance: effect.minResistance }
                );
                for (const card of targets) {
                    applyHeal(G, card, effect.count || 1);
                }
                continue;
            }
            if (effect.type === 'EXERT' && effect.all) {
                const targets = collectMatchingCharacters(
                    G,
                    effect.target as string[][],
                    { maxResistance: effect.maxResistance }
                );
                for (const card of targets) {
                    applyExert(G, card);
                }
                continue;
            }
            if (effect.type === 'WOUND' && effect.all) {
                const targets = collectMatchingCharacters(
                    G,
                    effect.target as string[][]
                );
                for (const card of targets) {
                    applyWoundAndCheckDeath(G, card, effect.count || 1);
                }
            }
        }
    }
}
