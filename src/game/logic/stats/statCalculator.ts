import type { GameState, CardState } from '../../types';
import { getHunterStrengthBonus } from './mechanics/hunterModifier';
import { getEnduringStrengthBonus } from './mechanics/enduringModifier'; // 👈 Import

/**
 * Calcule la force totale effective d'un personnage à un instant T
 * en agrégeant toutes les sources de bonus/malus.
 */
export function getCalculatedStrength(G?: GameState, card?: CardState): number {
    if (!card) return 0;

    const cardId = card.instanceId || card.id;

    // 1. Force de base + Attachments
    let totalStrength = Number(card.strength) || 0;
    if (card.attachments) {
        card.attachments.forEach((att) => {
            if (att.strength) {
                totalStrength += Number(att.strength);
            }
        });
    }

    // 🟢 2. Bonus permanent Pugnace (ENDURING) : +2 force par blessure
    totalStrength += getEnduringStrengthBonus(card);

    // Si G n'est pas fourni (ex: vue hors partie, aperçu), on s'arrête ici de manière sûre
    if (!G) {
        return Math.max(0, totalStrength);
    }

    // 3. Modificateurs temporaires globaux (Events, capacités actives dans G)
    if (G.tempModifiers) {
        G.tempModifiers
            .filter((m) => m.targetCardId === cardId && m.stat === 'STRENGTH')
            .forEach((m) => {
                totalStrength += m.value;
            });
    }

    // 4. Bonus contextuels d'escarmouche (délégués aux sous-modules dédiés)
    if (G.skirmishes) {
        const activeSkirmish = G.skirmishes.find(
            (s) => s.companionId === cardId || s.minionIds?.includes(cardId)
        );

        if (activeSkirmish) {
            totalStrength += getHunterStrengthBonus(G, card, activeSkirmish);
        }
    }

    return Math.max(0, totalStrength);
}
