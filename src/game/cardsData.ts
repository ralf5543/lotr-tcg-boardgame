import type { CardType } from './types';

const DEFAULT_IMAGE = '/cards_visuals/lotr_default.jpg';
const DEFAULT_GAMETEXT =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.';

export const FREE_PEOPLES_DATABASE: CardType[] = [
    {
        id: '2c102',
        title: 'Frodon',
        subtitle: 'Aventurier Malgré Lui',
        imageUrl: '/cards_visuals/lotr02102.jpg',
        kind: 'FREE_PEOPLES',
        subType: 'COMPANION',
        twilightCost: 0,
        strength: 3,
        vitality: 4,
        culture: 'SHIRE',
        isUnique: true,
        gameText: DEFAULT_GAMETEXT
    },
    {
        id: '1r89',
        title: 'Aragorn',
        subtitle: 'Rôdeur du Nord',
        keyword: 'RANGER',
        race: 'MAN',
        imageUrl: '/cards_visuals/lotr01089.jpg',
        kind: 'FREE_PEOPLES',
        subType: 'COMPANION',
        twilightCost: 4,
        strength: 8,
        vitality: 4,
        culture: 'GONDOR',
        isUnique: true,
        gameText: 'Manoeuvre: Affaiblissez Aragorn pour le rendre défenseur +1 jusqu\'à la phase de ralliement',
        loreText: 'Nous sommes des hommes solitaires, Rôdeurs des Terres Sauvages, chasseurs - mais toujours chasseurs des serviteurs de l\'Ennemi...'
    },
    {
        id: '1r50',
        title: 'Legolas, Greenleaf',
        imageUrl: '/cards_visuals/lotr01050.jpg',
        kind: 'FREE_PEOPLES',
        subType: 'COMPANION',
        twilightCost: 2,
        strength: 6,
        vitality: 3,
        culture: 'ELVEN',
        isUnique: true,
        gameText: DEFAULT_GAMETEXT
    },
    {
        id: '1r13',
        title: 'Gimli, Son of Gloin',
        imageUrl: '/cards_visuals/lotr01013.jpg',
        kind: 'FREE_PEOPLES',
        subType: 'COMPANION',
        twilightCost: 2,
        strength: 6,
        vitality: 3,
        culture: 'DWARVEN',
        isUnique: true,
        gameText: DEFAULT_GAMETEXT
    },
    {
        id: '1r96',
        title: 'Boromir, Lord of Gondor',
        imageUrl: '/cards_visuals/lotr01096.jpg',
        kind: 'FREE_PEOPLES',
        subType: 'COMPANION',
        twilightCost: 3,
        strength: 7,
        vitality: 3,
        culture: 'GONDOR',
        isUnique: true,
        gameText: DEFAULT_GAMETEXT
    },
];

export const SHADOW_DATABASE: CardType[] = [
    {
        id: '1r237',
        title: 'The Witch-king, Lord of Angmar',
        imageUrl: '/cards_visuals/lotr01237.jpg',
        kind: 'SHADOW',
        subType: 'MINION',
        twilightCost: 8,
        strength: 14,
        vitality: 4,
        culture: 'WRAITH',
        isUnique: true,
        gameText: DEFAULT_GAMETEXT
    },
    {
        id: '3c69"',
        title: 'Saruman, Servant of thre Eye',
        imageUrl: '/cards_visuals/lotr03069.jpg',
        kind: 'SHADOW',
        subType: 'MINION',
        twilightCost: 4,
        strength: 8,
        vitality: 4,
        culture: 'ISENGARD',
        isUnique: true,
        gameText: DEFAULT_GAMETEXT
    },
    {
        id: '1c191',
        title: 'Moria Scout',
        imageUrl: '/cards_visuals/lotr01191.jpg',
        kind: 'SHADOW',
        subType: 'MINION',
        twilightCost: 1,
        strength: 5,
        vitality: 1,
        culture: 'MORIA',
        isUnique: false,
        gameText: DEFAULT_GAMETEXT
    },
    {
        id: '1c271',
        title: 'Orc Soldier',
        imageUrl: '/cards_visuals/lotr01271.jpg',
        kind: 'SHADOW',
        subType: 'MINION',
        twilightCost: 2,
        strength: 7,
        vitality: 2,
        culture: 'SAURON',
        isUnique: false,
        gameText: DEFAULT_GAMETEXT
    },
];
