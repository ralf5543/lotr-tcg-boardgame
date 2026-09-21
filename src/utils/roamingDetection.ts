import type { CardState } from "../game/types";

export const isMinionRoaming = (card: CardState, currentSiteIndex: number): boolean => {
    if (card.kind !== 'SHADOW' || card.type !== 'MINION' || typeof card.minionSiteNumber !== 'number') {
        return false;
    }
    const currentSiteNumber = currentSiteIndex + 1; // 0-8 -> 1-9
    return card.minionSiteNumber > currentSiteNumber;
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
