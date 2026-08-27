import type { CardState, GameState } from '../game/types';
import { getCalculatedStrength } from '../game/logic/stats/statCalculator';

/**
 * 1. Vitalité Maximale (Base + Attachments)
 */
export const getMaxVitality = (card: CardState): number => {
    let max = Number(card.vitality) || 0;
    if (card.attachments) {
        card.attachments.forEach((att) => {
            if (att.vitality) {
                max += Number(att.vitality);
            }
        });
    }
    return max;
};

/**
 * 2. Vitalité Effective / PV restants (Max - Wounds)
 */
export const getEffectiveVitality = (card: CardState): number => {
    if (!card) return 0;
    const wounds = Number(card.wounds) || 0;
    return Math.max(0, getMaxVitality(card) - wounds);
};

/**
 * 4. Force Effective (Base + Attachments)
 */
/**
 * Calcule la force effective d'une carte.
 * Si G est fourni, prend en compte l'état global du jeu (Escarmouches, Hunter, TempModifiers).
 * Si G n'est pas fourni, retombe automatiquement sur (Base + Attachments).
 */
export const getEffectiveStrength = (card: CardState, G?: GameState): number => {
    return getCalculatedStrength(G, card);
};

/**
 * 5. Résistance Effective (Base + Attachments - Burdens)
 */
export const getEffectiveResistance = (
    card: CardState,
    burdens: number = 0
): number => {
    if (!card) return 0;
    let resistance = Number(card.resistance) || 6;
    if (card.attachments) {
        card.attachments.forEach((att) => {
            if (att.resistance) {
                resistance += Number(att.resistance);
            }
        });
    }
    if (card.type === 'COMPANION' || card.type === 'ALLY') {
        resistance -= burdens;
    }
    return Math.max(0, resistance);
};