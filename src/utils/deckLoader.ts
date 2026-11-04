import type { DeckConfig } from '../decks/types';
import { loadSeedDeckForPlayer } from '../decks/deckStorage';
import { getCardById } from '../game/cardsData';

export type { DeckConfig } from '../decks/types';

/**
 * Fallback setup sans setupData : seeds JSON uniquement.
 * Les decks du builder arrivent via createMatch → setupData.decks.
 */
export const loadAndValidateDeck = (playerId: string): DeckConfig => {
    const config = loadSeedDeckForPlayer(playerId);

    // Vérification coût départ (max 4) — log soft, la vraie UX est dans le builder.
    const totalStartingCost = config.startingCompanionIds.reduce((sum, id) => {
        const card = getCardById(id);
        if (!card) return sum;
        const printed = Number(card.twilightCost) || 0;
        const reduce = Number(card.startingFellowshipTwilightReduce) || 0;
        return sum + Math.max(0, printed - reduce);
    }, 0);

    if (totalStartingCost > 4 && import.meta.env.DEV) {
        console.warn(
            `[DECK] Joueur ${playerId} : coût départ ${totalStartingCost} > 4`
        );
    }

    return config;
};
