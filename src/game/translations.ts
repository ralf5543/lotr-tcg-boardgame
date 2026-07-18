import type { CardKind, CardSubtype, CardRace, CardCulture, CardKeyword } from './types';

export const TRANSLATIONS = {
  kind: {
    FREE_PEOPLES: 'Peuple Libre',
    SHADOW: 'Ombre',
  } as Record<CardKind, string>,

  subType: {
    COMPANION: 'COMPAGNON',
    MINION: 'SÉIDE',
    EVENT: 'ÉVÉNEMENT',
    CONDITION: 'SITUATION',
    POSSESSION: 'POSSESSION',
    SITE: 'SITE',
    ARTIFACT: 'ARTEFACT',
  } as Record<CardSubtype, string>,

  race: {
    MAN: 'HOMME',
    DWARF: 'NAIN',
    ELF: 'ELFE',
    HOBBIT: 'HOBBIT',
    ENT: 'ENT',
    WIZARD: 'MAGICIEN',
    CREATURE: 'CRÉATURE',
    BALROG: 'BALROG',
    TROLL: 'TROLL',
    ORC: 'ORQUE',
    'URUK-HAI': 'URUK-HAI',
    NAZGUL: 'NAZGÛL',
  } as Record<CardRace, string>,

  culture: {
    GONDOR: 'Gondor',
    DWARVEN: 'Nain',
    ELVEN: 'Elfe',
    SHIRE: 'Comté',
    GANDALF: 'Gandalf',
    MORIA: 'Moria',
    WRAITH: 'Spectre',
    SAURON: 'Sauron',
    ISENGARD: 'Isengard',
    ROHAN: 'Rohan',
    DUNLAND: 'Dunland',
    ORC: 'Orque',
    GOLLUM: 'Gollum',
    MEN: 'Hommes',
    'URUK-HAI': 'Uruk-hai',
    'THE-ONE-RING': 'L\'Anneau Unique',
  } as Record<CardCulture, string>,

  keyword: {
    RANGER: 'Rôdeur',
    KNIGHT: 'Chevalier',
    ARCHER: 'Archer',
    DAMAGE: 'Dégâts + 1',
  } as Record<CardKeyword, string>
};