import type { Ability, CardState, GameState } from '../../types';
import { discardCardFromPlay } from '../../../utils/discardCardFromPlay';
import { whileConditionHolds } from '../../logic/stats/mechanics/whileModifier';
import { forEachInPlayCard } from './resolveCostTarget';

function abilityHasSelfDiscard(ability: Ability): boolean {
    return (ability.effects || []).some(
        (effect) =>
            effect.type === 'DISCARD' &&
            effect.target === 'SELF' &&
            (effect.count ?? 1) >= 1
    );
}

/**
 * Capacités WHILE avec défausse SELF (Balrog hors souterrain…) :
 * si la condition tient, défausse immédiatement.
 */
export function enforceWhileSelfDiscards(G: GameState): void {
    const toDiscard: CardState[] = [];
    forEachInPlayCard(G, (card) => {
        for (const ability of card.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!abilityHasSelfDiscard(ability)) continue;
            if (!whileConditionHolds(G, card, ability)) continue;
            toDiscard.push(card);
            break;
        }
    });
    for (const card of toDiscard) {
        discardCardFromPlay(G, card);
    }
}
