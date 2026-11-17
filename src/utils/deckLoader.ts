import type { DeckConfig } from '../decks/types';
import { loadSeedDeckForPlayer } from '../decks/deckStorage';
import { startingCompanionTwilightCost } from '../decks/validateDeck';
import { getCardById } from '../game/cardsData';

export type { DeckConfig } from '../decks/types';

/**
 * Fallback setup sans setupData : seeds JSON uniquement.
 * Les decks du builder arrivent via createMatch → setupData.decks.
 */
export const loadAndValidateDeck = (playerId: string): DeckConfig => {
    const config = loadSeedDeckForPlayer(playerId);

    // Vérification coût départ (max 4) — log soft, la vraie UX est dans le builder.
    const ringBearer = getCardById(config.ringBearerId);
    const totalStartingCost = config.startingCompanionIds.reduce((sum, id) => {
        const card = getCardById(id);
        if (!card) return sum;
        return sum + startingCompanionTwilightCost(card, ringBearer);
    }, 0);

    if (totalStartingCost > 4 && import.meta.env.DEV) {
        console.warn(
            `[DECK] Joueur ${playerId} : coût départ ${totalStartingCost} > 4`
        );
    }

    return config;
};
