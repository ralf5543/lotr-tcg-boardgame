import type { GameState, CardState } from '../game/types';
import { getEffectiveVitality } from './cardStats';

/**
 * Applique une mort directe par submersion (overwhelm).
 * Ne modifie PAS le compteur de blessures (card.wounds).
 */
export const applyOverwhelmAndCheckDeath = (
    G: GameState,
    card: CardState
): void => {
    if (!card) return;

    const cardId = card.instanceId || card.id;

    // 1. Enregistrer l'ID pour déclencher le son et l'animation de baffe
    if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
    if (cardId && !G.lastWoundedCardIds.includes(cardId)) {
        G.lastWoundedCardIds.push(cardId);
    }

    // 2. Marqueurs d'état pour le moteur de jeu et l'UI CSS
    card.isDead = true;
    card.isOverwhelmed = true;

    if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
    if (cardId && !G.pendingDeadCardIds.includes(cardId)) {
        G.pendingDeadCardIds.push(cardId);
    }
};

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

    // 3. Calculer la vitalité
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
