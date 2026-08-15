import type { CardState } from '../game/types';

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
export const getEffectiveStrength = (card: CardState): number => {
    if (!card) return 0;
    let strength = Number(card.strength) || 0;
    if (card.attachments) {
        card.attachments.forEach((att) => {
            if (att.strength) {
                strength += Number(att.strength);
            }
        });
    }
    return strength;
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