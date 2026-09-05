import type { Ability, AbilityCost, CardState, GameState } from '../../types';
import { applyExert } from '../../../utils/applyExert';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { resolveCostTarget } from './resolveCostTarget';

function canPayOption(
    G: GameState,
    source: CardState,
    option: AbilityCost[number]
): boolean {
    if (option.exert && Array.isArray(option.exert)) {
        for (const req of option.exert) {
            const count = req.count || 1;
            const cards = resolveCostTarget(G, source, req.target);
            if (cards.length === 0) return false;
            const payable = cards.filter(
                (c) => getEffectiveVitality(c) > count
            );
            if (payable.length < 1) return false;
        }
    }

    return true;
}

export function canPayAbilityCost(
    G: GameState,
    source: CardState,
    cost: AbilityCost
): boolean {
    if (!cost || cost.length === 0) return true;
    return cost.some((option) => canPayOption(G, source, option));
}

function payOption(
    G: GameState,
    source: CardState,
    option: AbilityCost[number]
): boolean {
    if (option.exert && Array.isArray(option.exert)) {
        for (const req of option.exert) {
            const count = req.count || 1;
            const cards = resolveCostTarget(G, source, req.target);
            const target = cards.find((c) => getEffectiveVitality(c) > count);
            if (!target) return false;
            for (let i = 0; i < count; i += 1) {
                if (!applyExert(G, target)) return false;
            }
        }
    }
    return true;
}

export function payAbilityCost(
    G: GameState,
    source: CardState,
    cost: AbilityCost
): boolean {
    if (!cost || cost.length === 0) return true;
    const option = cost.find((opt) => canPayOption(G, source, opt));
    if (!option) return false;
    return payOption(G, source, option);
}

export function canPayAbility(G: GameState, source: CardState, ability: Ability): boolean {
    return canPayAbilityCost(G, source, ability.cost);
}
