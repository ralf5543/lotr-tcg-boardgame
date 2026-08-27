import type { GameState, CardState, SkirmishState } from '../../../types';
import { getKeywordValue } from '../../../engine/keywords/keywordUtils';

/**
 * Calcule le bonus de force apporté par le mot-clé HUNTER dans une escarmouche.
 */
export function getHunterStrengthBonus(
    G: GameState,
    card: CardState,
    skirmish: SkirmishState
): number {
    const hunterValue = getKeywordValue(card, 'HUNTER');
    if (hunterValue <= 0) return 0;

    const cardId = card.instanceId || card.id;
    const isCompanion = card.kind === 'FREE_PEOPLE';
    let opponents: CardState[] = [];

    if (isCompanion) {
        opponents = (G.battlefield || []).filter((c) =>
            skirmish.minionIds.includes(c.instanceId || c.id)
        );
    } else {
        const fpPlayer = G.players[G.fpPlayerId || '0'];
        const comp = fpPlayer?.fellowshipArea?.find(
            (c) => (c.instanceId || c.id) === skirmish.companionId
        );
        if (comp) opponents = [comp];
    }

    // Le bonus s'active si au moins un opposant n'a pas HUNTER
    const hasNonHunterOpponent = opponents.some(
        (opp) => getKeywordValue(opp, 'HUNTER') <= 0
    );

    return hasNonHunterOpponent ? hunterValue : 0;
}
