import type { CardState } from "../game/types";

export const isMinionRoaming = (card: CardState, currentSiteIndex: number): boolean => {
    if (card.kind !== 'SHADOW' || card.type !== 'MINION' || typeof card.minionSiteNumber !== 'number') {
        return false;
    }
    const currentSiteNumber = currentSiteIndex + 1; // 0-8 -> 1-9
    return card.minionSiteNumber > currentSiteNumber;
};

export const getEffectiveTwilightCost = (card: CardState, currentSiteIndex: number): number => {
    const baseCost = Number(card.twilightCost) || 0;
    if (isMinionRoaming(card, currentSiteIndex)) {
        return baseCost + 2;
    }
    return baseCost;
};