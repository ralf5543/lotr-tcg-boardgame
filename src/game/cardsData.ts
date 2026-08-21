import rawCards from '../data/cards.json';
import rawSites from '../data/sites.json';
import type { CardState } from './types';

// Fusion des cartes normales et des sites dans la même base
export const CARDS_DATABASE: CardState[] = [
    ...(rawCards as unknown as CardState[]),
    ...(rawSites as unknown as CardState[]),
];

// Recherche d'une carte spécifique par son ID (ex: "1R89" ou "11S241")
export const getCardById = (id: string): CardState | undefined => {
    return CARDS_DATABASE.find(
        (card) => card.id.toLowerCase() === id.toLowerCase()
    );
};