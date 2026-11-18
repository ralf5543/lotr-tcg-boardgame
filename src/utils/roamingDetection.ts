import type { CardState } from "../game/types";

/** Numéro de site effectif (imprimé + mods temporaires). */
export const getEffectiveMinionSiteNumber = (
    card: CardState
): number | undefined => {
    if (typeof card.minionSiteNumber !== 'number') return undefined;
    const mods = (card.tempSiteNumberMods || []).reduce(
        (sum, mod) => sum + (mod.value || 0),
        0
    );
    return card.minionSiteNumber + mods;
};

export const isMinionRoaming = (card: CardState, currentSiteIndex: number): boolean => {
    if (card.kind !== 'SHADOW' || card.type !== 'MINION') {
        return false;
    }
    const siteNumber = getEffectiveMinionSiteNumber(card);
    if (typeof siteNumber !== 'number') return false;
    const currentSiteNumber = currentSiteIndex + 1; // 0-8 -> 1-9
    return siteNumber > currentSiteNumber;
};

/** Coût de base + errance. Passer `twilightModifier` pour les passifs While (Olog…). */
export const getEffectiveTwilightCost = (
    card: CardState,
    currentSiteIndex: number,
    twilightModifier = 0
): number => {
    const baseCost = Number(card.twilightCost) || 0;
    const isRoaming = isMinionRoaming(card, currentSiteIndex);
    const cost = (isRoaming ? baseCost + 2 : baseCost) + twilightModifier;
    return Math.max(0, cost);
};
