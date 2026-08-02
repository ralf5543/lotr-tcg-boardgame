import type { CardState } from '../game/types';

/**
 * Calcule la vitalité restante/effective d'une carte.
 * Si la carte a des tokens de blessure (wounds), on les soustrait de la vitalité de base.
 */
export const getEffectiveVitality = (card: CardState): number => {
    let vitality = Number(card.vitality) || 0;
    const wounds = card.wounds || 0;

    if (card.attachments) {
        card.attachments.forEach((att) => {
            if (att.vitality) {
                vitality += Number(att.vitality);
            }
        });
    }

    // La vitalité ne descend pas en dessous de 0
    return Math.max(0, vitality - wounds);
};

/**
 * OPTIONNEL : Calcule la force effective (base + bonus d'attachements)
 */
export const getEffectiveStrength = (card: CardState): number => {
    let strength = Number(card.strength) || 0;

    // Ajoute les bonus des objets/possessions attachés s'il y en a
    if (card.attachments) {
        card.attachments.forEach((att) => {
            if (att.strength) {
                strength += Number(att.strength);
            }
        });
    }

    return strength;
};
