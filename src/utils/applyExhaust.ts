import type { GameState, CardState } from '../game/types';
import { getEffectiveVitality } from './cardStats';
import { applyWoundAndCheckDeath } from './applyWoundAndCheckDeath';

/**
 * Exhaust (CR) : blesser jusqu’à laisser 1 vitalité.
 * Refuse si déjà exhaust (≤ 1) ou mort.
 */
export const applyExhaust = (G: GameState, card: CardState): boolean => {
    if (!card || card.isDead) return false;

    const currentVitality = getEffectiveVitality(card);
    if (currentVitality <= 1) return false;

    const woundsNeeded = currentVitality - 1;
    applyWoundAndCheckDeath(G, card, woundsNeeded);
    return getEffectiveVitality(card) === 1;
};
