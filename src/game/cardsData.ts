import rawCards from '../data/cards.json';
import type { CardState, SiteCardState } from './types';

// Exportation de la base complète issue du CSV
export const CARDS_DATABASE: CardState[] = rawCards as unknown as CardState[];

// Recherche d'une carte spécifique par son ID (ex: "1R89" ou "1r89")
export const getCardById = (id: string): CardState | undefined => {
    return CARDS_DATABASE.find(
        (card) => card.id.toLowerCase() === id.toLowerCase()
    );
};

// On conserve tes sites de test pour le moment
export const DUMMY_SITES_PLAYER_0: SiteCardState[] = [
    {
        id: '11u227',
        name: "Berges de l'Anduin",
        twilightCost: 0,
        gameText: "Le total d'archerie des séides est de +2 pour chaque compagnon au delà de 4.",
        keywords: ['RIVER'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr11u227.jpg',
    },
    {
        id: '11s234',
        name: "Les Pics d'Emyn Muil",
        twilightCost: 0,
        gameText: "Si ce site est dans la région 2 et que la compagnie le quitte pendant la phase de ralliement, blessez chaque compagnon.",
        keywords: ['MOUNTAIN'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr11s234.jpg',
    },
    {
        id: '12u194',
        name: "Champ de Bataille du Plateau",
        twilightCost: 2,
        gameText: "** Combat :** Affaiblissez votre Homme (sauf un Homme pugnace) pour qu'il inflige des **dégâts +1**.",
        keywords: ['PLAINS'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr12u194.jpg',
    },
    {
        id: '11s258',
        name: "Buttes de Scories",
        twilightCost: 1,
        gameText: "Chaque fois qu'un compagnon est tué, ajoutez un point-fardeau.",
        keywords: ['BATTLEGROUND'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr11s258.jpg',
    },
    {
        id: '11s243',
        name: "Harrowdale",
        twilightCost: 3,
        gameText: "Jusqu'à la phase de ralliement, chaque séide qui combat un compagnon {CULTURE_ROHAN} perd acharné et ne peut pas acquérir acharné.",
        keywords: ['PLAINS'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr11s243.jpg',
    },
    {
        id: '11s250',
        name: "Méandre du Nord",
        twilightCost: 3,
        gameText: "Le total d'archerie des séides est de -3.",
        keywords: ['RIVER'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr11s250.jpg',
    },
    {
        id: '11s262',
        name: "La Tour de Garde de Cirith Ungol",
        twilightCost: 1,
        gameText: "**Manoeuvre : **Affaiblissez votre séide {CULTURE_ORC} pour défausser une carte au hasard de la main du joueur des Peuples Libres.",
        keywords: ['MOUNTAIN'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr11s262.jpg',
    },
    {
        id: '11s239',
        name: "La Clairière de Fangorn",
        twilightCost: 0,
        gameText: "Quand la compagnie se déplace jusqu'à ce site, ajoutez {TWILIGHT_1} pour chaque arme des Peuples Libres.",
        keywords: ['FOREST'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr11s239.jpg',
    },
    {
        id: '13s192',
        name: "Les Grandes Portes",
        twilightCost: 0,
        gameText: "Tant qu'un joueur peut désigner plus de compagnons que de séides, chaque séide a +1 en force.",
        keywords: ['BATTLEGROUND'],
        ownerId: '0',
        imageUrl: '/cards_visuals/sites/lotr13s192.jpg',
    },
];