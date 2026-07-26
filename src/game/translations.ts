import type {
    CardKind,
    CardType,
    CardSubtype,
    CardRace,
    CardCulture,
    CardKeyword,
} from './types';

export const TRANSLATIONS = {
    phase: {
        ARCHERY: 'Archerie',
        ASSIGNMENT: 'Affectation',
        FELLOWSHIP: 'Compagnie',
        MANEUVER: 'Manœuvre',
        REGROUP: 'Ralliement',
        SHADOW: 'Ombre',
        SKIRMISH: 'Combat',
    },

    kind: {
        FREE_PEOPLES: 'Peuples Libres',
        SHADOW: 'Ombre',
    } as Record<CardKind, string>,

    type: {
        ALLY: 'Allié',
        ARTIFACT_CHARACTER: 'Artefact',
        ARTIFACT_SUPPORT: 'Artefact',
        COMPANION: 'Compagnon',
        CONDITION_CHARACTER: 'Situation',
        CONDITION_SUPPORT: 'Situation',
        EVENT: 'Événement',
        FOLLOWER: 'Suivant',
        MINION: 'Séide',
        POSSESSION_CHARACTER: 'Possession',
        POSSESSION_SUPPORT: 'Possession',
    } as Record<CardType, string>,

    subtype: {
        ARMOR: 'Armure',
        BOX: 'Boîte',
        BRACERS: 'Brassards',
        BROOCH: 'Broche',
        CLOAK: 'Capé',
        EVENT: 'Évènement',
        GAUNTLETS: 'Gantelets',
        'HAND-WEAPON': 'Arme de Mêlée',
        HELM: 'Heaume',
        MOUNT: 'Monture',
        PALANTIR: 'Palantir',
        PHIAL: 'Fiole',
        PIPE: 'Pipe',
        'RANGED-WEAPON': 'Arme de Portée',
        RING: 'Anneau',
        SHIELD: 'Bouclier',
        STAFF: 'Bâton',
    } as Record<CardSubtype, string>,

    race: {
        BALROG: 'Balrog',
        CREATURE: 'Créature',
        DWARF: 'Nain',
        ELF: 'Elfe',
        ENT: 'Ent',
        HOBBIT: 'Hobbit',
        MAIA: 'Maia',
        MAN: 'Homme',
        NAZGUL: 'Nazgûl',
        ORC: 'Orque',
        SPIDER: 'Araignée',
        TROLL: 'Troll',
        'URUK-HAI': 'Ourouk-Hai',
        WIZARD: 'Magicien',
        WRAITH: 'Spectre',
    } as Record<CardRace, string>,

    culture: {
        DUNLAND: 'Dunland',
        DWARVEN: 'Nain',
        ELVEN: 'Elfe',
        GANDALF: 'Gandalf',
        GOLLUM: 'Gollum',
        GONDOR: 'Gondor',
        ISENGARD: 'Isengard',
        MEN: 'Hommes',
        MORIA: 'Moria',
        ORC: 'Orque',
        RINGWRAITH: 'Spectre',
        ROHAN: 'Rohan',
        SAURON: 'Sauron',
        SHIRE: 'Comté',
        'THE-ONE-RING': "L'Anneau Unique",
        'URUK-HAI': 'Uruk-hai',
    } as Record<CardCulture, string>,

    keyword: {
        AID: {
            label: 'Aide',
            description: "Texte d'explication pour le mot-clé Aide.",
        },
        AMBUSH: {
            label: 'Embuscade',
            description: "Texte d'explication pour le mot-clé Embuscade.",
        },
        ARCHER: {
            label: 'Archer',
            description: "Texte d'explication pour le mot-clé Archer.",
        },
        BATTLEGROUND: {
            label: 'Champ de Bataille',
            description:
                "Texte d'explication pour le mot-clé Champ de Bataille.",
        },
        BESIEGER: {
            label: 'Assiégeant',
            description: "Texte d'explication pour le mot-clé Assiégeant.",
        },
        CORSAIR: {
            label: 'Pirate',
            description: "Texte d'explication pour le mot-clé Pirate.",
        },
        DAMAGE: {
            label: 'Dégâts + 1',
            description: "Texte d'explication pour le mot-clé Dégâts + 1.",
        },
        DEFENDER: {
            label: 'Défenseur + 1',
            description: "Texte d'explication pour le mot-clé Défenseur + 1.",
        },
        DWELLING: {
            label: 'Résidence',
            description: "Texte d'explication pour le mot-clé Résidence.",
        },
        EASTERLING: {
            label: 'Oriental',
            description: "Texte d'explication pour le mot-clé Oriental.",
        },
        ENDURING: {
            label: 'Pugnace',
            description: "Texte d'explication pour le mot-clé Pugnace.",
        },
        ENGINE: {
            label: 'Engin',
            description: "Texte d'explication pour le mot-clé Engin.",
        },
        FIERCE: {
            label: 'Acharné',
            description: "Texte d'explication pour le mot-clé Acharné.",
        },
        FOREST: {
            label: 'Forêt',
            description: "Texte d'explication pour le mot-clé Forêt.",
        },
        FORTIFICATION: {
            label: 'Fortification',
            description: "Texte d'explication pour le mot-clé Fortification.",
        },
        HUNTER: {
            label: 'Chasseur',
            description: "Texte d'explication pour le mot-clé Chasseur.",
        },
        KNIGHT: {
            label: 'Chevalier',
            description: "Texte d'explication pour le mot-clé Chevalier.",
        },
        LURKER: {
            label: 'Embusqué',
            description: "Texte d'explication pour le mot-clé Embusqué.",
        },
        MACHINE: {
            label: 'Machine',
            description: "Texte d'explication pour le mot-clé Machine.",
        },
        MARSH: {
            label: 'Marais',
            description: "Texte d'explication pour le mot-clé Marais.",
        },
        MOUNTAIN: {
            label: 'Montagne',
            description: "Texte d'explication pour le mot-clé Montagne.",
        },
        MUSTER: {
            label: 'Rassembleur',
            description: "Texte d'explication pour le mot-clé Rassembleur.",
        },
        PIPEWEED: {
            label: 'Herbe à pipe',
            description: "Texte d'explication pour le mot-clé Herbe à pipe.",
        },
        PLAINS: {
            label: 'Plaines',
            description: "Texte d'explication pour le mot-clé Plaines.",
        },
        RANGER: {
            label: 'Rôdeur',
            description: "Texte d'explication pour le mot-clé Rôdeur.",
        },
        'RING-BEARER': {
            label: "Porteur de l'Anneau",
            description:
                "Texte d'explication pour le mot-clé Porteur de l'Anneau.",
        },
        'RING-BOUND': {
            label: "Associé à l'Anneau",
            description:
                "Texte d'explication pour le mot-clé Associé à l'Anneau.",
        },
        RIVER: {
            label: 'Rivière',
            description: "Texte d'explication pour le mot-clé Rivière.",
        },
        SEARCH: {
            label: 'Recherche',
            description: "Texte d'explication pour le mot-clé Recherche.",
        },
        SOUTHRON: {
            label: 'Suderon',
            description: "Texte d'explication pour le mot-clé Suderon.",
        },
        SPELL: {
            label: 'Sort',
            description: "Texte d'explication pour le mot-clé Sort.",
        },
        STEALTH: {
            label: 'Dissimulation',
            description: "Texte d'explication pour le mot-clé Dissimulation.",
        },
        TALE: {
            label: 'Récit',
            description: "Texte d'explication pour le mot-clé Récit.",
        },
        TENTACLE: {
            label: 'Tentacule',
            description: "Texte d'explication pour le mot-clé Tentacule.",
        },
        TOIL: {
            label: 'Éreintement',
            description: "Texte d'explication pour le mot-clé Éreintement.",
        },
        TRACKER: {
            label: 'Traqueur',
            description: "Texte d'explication pour le mot-clé Traqueur.",
        },
        TWILIGHT: {
            label: 'Crépusculaire',
            description: "Texte d'explication pour le mot-clé Crépusculaire.",
        },
        UNDERGROUND: {
            label: 'Souterrain',
            description: "Texte d'explication pour le mot-clé Souterrain.",
        },
        UNHASTY: {
            label: 'Peu hâtif',
            description: "Texte d'explication pour le mot-clé Peu hâtif.",
        },
        VALIANT: {
            label: 'Vaillant',
            description: "Texte d'explication pour le mot-clé Vaillant.",
        },
        VILLAGER: {
            label: 'Villageois',
            description: "Texte d'explication pour le mot-clé Villageois.",
        },
        'WARG-RIDER': {
            label: 'Chevaucheur de ouague',
            description:
                "Texte d'explication pour le mot-clé Chevaucheur de ouague.",
        },
        WEATHER: {
            label: 'Climat',
            description: "Texte d'explication pour le mot-clé Climat.",
        },
    } as Record<CardKeyword, KeywordData>,
};
