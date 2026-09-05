import type { GameState, CardState } from '../game/types';
import { getEffectiveVitality } from './cardStats';
import { applyWoundAndCheckDeath } from './applyWoundAndCheckDeath';

/**
 * Exert = 1 blessure qui ne peut pas tuer.
 * Refuse (sans toucher la carte) si la vitalité effective ≤ 1.
 */
export const applyExert = (G: GameState, card: CardState): boolean => {
    if (!card) return false;

    const currentVitality = getEffectiveVitality(card);
    if (currentVitality <= 1) return false;

    applyWoundAndCheckDeath(G, card, 1);
    return true;
};
