import type { CardKind, CardSubtype, CardRace, CardCulture, CardKeyword } from './types';

export const TRANSLATIONS = {
  phase: {
    FELLOWSHIP: 'Compagnie',
    SHADOW: 'Ombre',
    MANEUVER: 'Maneouvre',
    ARCHERY: 'Archerie',
    ASSIGNMENT: 'Affectation',
    SKIRMISH: 'Combat',
    REGROUP: 'Ralliement',
  },

  kind: {
    FREE_PEOPLES: 'Peuples Libres',
    SHADOW: 'Ombre',
  } as Record<CardKind, string>,

  subType: {
    COMPANION: 'compagnon',
    MINION: 'séide',
    EVENT: 'événement',
    CONDITION_CHARACTER: 'situation',
    CONDITION_SUPPORT: 'situation',
    POSSESSION_CHARACTER: 'possession',
    POSSESSION_SUPPORT: 'possession',
    ARTIFACT_CHARACTER: 'artefact',
    ARTIFACT_SUPPORT: 'artefact',
  } as Record<CardSubtype, string>,

  race: {
    MAN: 'Homme',
    DWARF: 'Nain',
    ELF: 'Elfe',
    HOBBIT: 'Hobbit',
    ENT: 'Ent',
    WIZARD: 'Magicien',
    CREATURE: 'Créature',
    BALROG: 'Balrog',
    TROLL: 'Troll',
    ORC: 'Orque',
    'URUK-HAI': 'Uruk-H',
    NAZGUL: 'Nazgûl',
  } as Record<CardRace, string>,

  culture: {
    GONDOR: 'Gondor',
    DWARVEN: 'Nain',
    ELVEN: 'Elfe',
    SHIRE: 'Comté',
    GANDALF: 'Gandalf',
    MORIA: 'Moria',
    RINGWRAITH: 'Spectre',
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
    'RING-BEARER': 'Porteur de l\'Anneau',
    RANGER: 'Rôdeur',
    KNIGHT: 'Chevalier',
    ARCHER: 'Archer',
    DAMAGE: 'Dégâts + 1',
    RIVER: 'Rivière',
    FOREST: 'Forêt',
    MOUNTAIN: 'Montagne',
    UNDERGROUND: 'Souterrain',
    DWELLING: 'Résidence',
    PLAINS: 'Plaines',
    SWAMP: 'Marais',
    BATTLEGROUND: 'Champ de Bataille',
  } as Record<CardKeyword, string>
};