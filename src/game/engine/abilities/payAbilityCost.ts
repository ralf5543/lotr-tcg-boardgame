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

function pickExertTarget(
    cards: CardState[],
    count: number,
    chosenTargetId?: string,
    requireChoice = false
): CardState | undefined {
    const payable = cards.filter((c) => getEffectiveVitality(c) > count);
    if (chosenTargetId) {
        return payable.find(
            (c) => c.instanceId === chosenTargetId || c.id === chosenTargetId
        );
    }
    if (requireChoice) return undefined;
    if (payable.length === 1) return payable[0];
    return undefined;
}

function payOption(
    G: GameState,
    source: CardState,
    option: AbilityCost[number],
    chosenTargetId?: string
): boolean {
    if (option.exert && Array.isArray(option.exert)) {
        for (const req of option.exert) {
            const count = req.count || 1;
            const cards = resolveCostTarget(G, source, req.target);
            const isNamed = Array.isArray(req.target);
            const target = isNamed
                ? pickExertTarget(
                      cards,
                      count,
                      chosenTargetId,
                      req.mode === 'DESIGNATION'
                  )
                : pickExertTarget(cards, count);
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
    cost: AbilityCost,
    chosenTargetId?: string
): boolean {
    if (!cost || cost.length === 0) return true;
    const option = cost.find((opt) => canPayOption(G, source, opt));
    if (!option) return false;
    return payOption(G, source, option, chosenTargetId);
}

export function canPayAbility(G: GameState, source: CardState, ability: Ability): boolean {
    return canPayAbilityCost(G, source, ability.cost);
}
