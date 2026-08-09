import type { CardState } from "../game/types";
import { CARDS_DATABASE } from "../game/cardsData";

// Helper pour mélanger le deck
export const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/**
 * Construit un deck à partir d'un tableau d'IDs de cartes.
 * Génère des instances uniques pour pouvoir répéter un ID jusqu'à 4 fois (ou plus).
 */
export const buildDeckFromIds = (cardIds: string[], playerId: string): CardState[] => {
    const deck: CardState[] = [];

    cardIds.forEach((id, index) => {
        // Recherche dans la base de données par l'ID exact de la carte (ex: "19P38")
        const baseCard = CARDS_DATABASE.find((c) => c.id === id);

        if (baseCard) {
            deck.push({
                ...baseCard,
                // ID unique de l'instance en jeu (ex: p0-19P38-0-abc12)
                id: `p${playerId}-${baseCard.id}-${index}-${Math.random().toString(36).substring(2, 7)}`,
                isFaceDown: false,
                wounds: 0,
                attachments: [],
            });
        } else {
            console.warn(`[DeckBuilder] Carte avec l'ID "${id}" introuvable dans CARDS_DATABASE.`);
        }
    });

    return shuffle(deck);
};