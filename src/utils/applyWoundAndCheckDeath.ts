import type { GameState, CardState } from '../game/types';
import { getEffectiveVitality } from './cardStats';

/**
 * Inflige N blessures dans G, enregistre les identifiants pour l'animation visuelle
 * et marque la carte si le coup est fatal.
 */
export const applyWoundAndCheckDeath = (
    G: GameState,
    card: CardState,
    woundsCount = 1
): boolean => {
    if (!card) return false;

    // 1. Infliger les blessures sur la carte
    card.wounds = (card.wounds || 0) + woundsCount;

    const cardId = card.instanceId || card.id;

    // 2. Marquer l'ID pour l'animation d'impact dans React
    if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
    if (cardId && !G.lastWoundedCardIds.includes(cardId)) {
        G.lastWoundedCardIds.push(cardId);
    }

    // 3. Calculer si le coup est fatal (Vitalité restante <= 0)
    const effectiveVitality = getEffectiveVitality(card);
    const isDead = effectiveVitality <= 0;

    // 4. Si la carte meurt, marquer le flag et alimenter pendingDeadCardIds
    if (isDead) {
        card.isDead = true;
        if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
        if (cardId && !G.pendingDeadCardIds.includes(cardId)) {
            G.pendingDeadCardIds.push(cardId);
        }
    }

    return isDead;
};