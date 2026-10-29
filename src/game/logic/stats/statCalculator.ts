import type { GameState, CardState } from '../../types';
import { getHunterStrengthBonus } from './mechanics/hunterModifier';
import { getEnduringStrengthBonus } from './mechanics/enduringModifier'; // 👈 Import
import {
    getWhileStrengthBonus,
    isWeaponAttachment,
    isWeaponStrengthSuppressed,
} from './mechanics/whileModifier';
import { isRingBearerCard } from '../../../utils/cardUtils';

/**
 * Calcule la force totale effective d'un personnage à un instant T
 * en agrégeant toutes les sources de bonus/malus.
 */
export function getCalculatedStrength(G?: GameState, card?: CardState): number {
    if (!card) return 0;

    const cardId = card.instanceId || card.id;
    const suppressWeapons = Boolean(G && isWeaponStrengthSuppressed(G, card));

    // 1. Force de base + Attachments
    let totalStrength = Number(card.strength) || 0;
    if (card.attachments) {
        card.attachments.forEach((att) => {
            if (!att?.strength) return;
            // Troop of Uruk-hai : pas de bonus de force des armes.
            if (suppressWeapons && isWeaponAttachment(att)) return;
            totalStrength += Number(att.strength);
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
        const weaponIds = new Set(
            (card.attachments || [])
                .filter((att) => att && isWeaponAttachment(att))
                .map((att) => att!.instanceId || att!.id)
        );
        G.tempModifiers
            .filter((m) => m.targetCardId === cardId && m.stat === 'STRENGTH')
            .forEach((m) => {
                // Troop : pas de +force posé par une arme (Knight's Spear…).
                if (
                    suppressWeapons &&
                    m.sourceCardId &&
                    weaponIds.has(m.sourceCardId)
                ) {
                    return;
                }
                totalStrength += m.value;
            });
    }

    // 3b. Anneau au doigt : bonus de force du Porteur
    if (
        G.wearingTheOneRing?.strengthBonus &&
        isRingBearerCard(card)
    ) {
        totalStrength += G.wearingTheOneRing.strengthBonus;
    }

    // 3c. Passifs While (spot / crépuscule → force)
    // Troop : les While d’armes sont exclus dans getWhileStrengthBonus.
    totalStrength += getWhileStrengthBonus(G, card, {
        suppressWeaponSources: suppressWeapons,
    });

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
