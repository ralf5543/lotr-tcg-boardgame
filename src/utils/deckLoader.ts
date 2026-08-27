//import deckP0 from '../game/decks/fumeurs-gollum-threats.json';
//import deckP0 from '../game/decks/gondor-uruks.json';
import deckP0 from '../game/decks/test-dev.json';
//import deckP1 from '../game/decks/test-dev.json';
//import deckP1 from '../game/decks/test-dev.json';
import deckP1 from '../game/decks/gondor-uruks.json';
import { CARDS_DATABASE } from '../game/cardsData';

export interface DeckConfig {
    id: string;
    name: string;
    ringBearerId: string;
    oneRingId: string;
    startingCompanionIds: string[];
    freePeople: string[];
    shadow: string[];
    siteIds: string[];
}

export const DECKS: Record<string, DeckConfig> = {
    '0': deckP0 as DeckConfig,
    '1': deckP1 as DeckConfig,
};

export const loadAndValidateDeck = (playerId: string) => {
    const config = DECKS[playerId] || DECKS['0'];

    const totalFP = config.freePeople.length + config.startingCompanionIds.length;
    const totalShadow = config.shadow.length;

    // Vérification de l'équité 50/50
    if (totalFP !== totalShadow) {
        console.warn(
            `[DECK WARNING] Joueur ${playerId} : ` +
            `Total FP (${totalFP} = ${config.freePeople.length} pioche + ${config.startingCompanionIds.length} départ) ` +
            `!= Total Ombre (${totalShadow}) !`
        );
    }

    // Vérification du coût des compagnons de départ (max 4)
    const totalStartingCost = config.startingCompanionIds.reduce((sum, id) => {
        const card = CARDS_DATABASE.find((c) => c.id === id);
        return sum + (card?.twilightCost ?? 0);
    }, 0);

    if (totalStartingCost > 4) {
        console.warn(
            `[DECK WARNING] Joueur ${playerId} : ` +
            `Coût des compagnons de départ (${totalStartingCost}) > 4 !`
        );
    }

    return config;
};