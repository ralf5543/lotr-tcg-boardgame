import type { CardType } from './types';

export const FREE_PEOPLES_DATABASE: CardType[] = [
  {
    id: '2c102',
    title: 'Frodo, Reluctant Adventurer',
    imageUrl: '/cards_visuals/lotr02102.jpg',
    kind: 'FREE_PEOPLES',
    subType: 'COMPANION',
    twilightCost: 0,
    strength: 3,
    vitality: 4,
    culture: 'shire'
  },
  {
    id: '1r89',
    title: 'Aragorn, Ranger of the North',
    imageUrl: '/cards_visuals/lotr01089.jpg',
    kind: 'FREE_PEOPLES',
    subType: 'COMPANION',
    twilightCost: 4,
    strength: 8,
    vitality: 4,
    culture: 'gondor'
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
    culture: 'elven'
  },
  {
    id: '1r13',
    title: 'Gimli, Son of Gloin',
    imageUrl: '/cards_visuals/lotr01013.jpg',
    kind: 'FREE_PEOPLES',
    subType: 'COMPANION',
    twilightCost: 2,
    strength: 6,
    vitality: 4,
    culture: 'dwarven'
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
    culture: 'gondor'
  }
];

export const SHADOW_DATABASE: CardType[] = [
  {
    id: 'sh-witchking',
    title: 'The Witch-king, Lord of Angmar',
    kind: 'SHADOW',
    subType: 'MINION',
    twilightCost: 8,
    strength: 14,
    vitality: 4,
    culture: 'wraith'
  },
  {
    id: 'sh-uruk-slayer',
    title: 'Uruk Slayer',
    kind: 'SHADOW',
    subType: 'MINION',
    twilightCost: 2,
    strength: 7,
    vitality: 2,
    culture: 'isengard'
  },
  {
    id: 'sh-uruk-fighter',
    title: 'Uruk Fighter',
    kind: 'SHADOW',
    subType: 'MINION',
    twilightCost: 3,
    strength: 8,
    vitality: 2,
    culture: 'isengard'
  },
  {
    id: 'sh-moria-scout',
    title: 'Moria Scout',
    kind: 'SHADOW',
    subType: 'MINION',
    twilightCost: 1,
    strength: 5,
    vitality: 1,
    culture: 'moria'
  },
  {
    id: 'sh-orc-soldier',
    title: 'Orc Soldier',
    kind: 'SHADOW',
    subType: 'MINION',
    twilightCost: 2,
    strength: 6,
    vitality: 2,
    culture: 'sauron'
  }
];