import type {
    CardKind,
    CardType,
    CardSubtype,
    CardRace,
    CardCulture,
    CardKeyword,
    KeywordData,
} from './types';

const unloadKeyword =
    "Mot-clé générique, sans effet particulier. Il peut être désigné par d'autres cartes pour déclencher des effets.";

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
        FREE_PEOPLE: 'Peuples Libres',
        SHADOW: 'Ombre',
    } as Record<CardKind, string>,

    type: {
        ALLY: 'Allié',
        ARTIFACT: 'Artefact',
        COMPANION: 'Compagnon',
        CONDITION: 'Situation',
        EVENT: 'Événement',
        FOLLOWER: 'Suivant',
        MINION: 'Séide',
        POSSESSION: 'Possession',
    } as Record<CardType, string>,

    subtype: {
        // Phases (Events)
        ARCHERY: 'Archerie',
        ASSIGNMENT: 'Affectation',
        FELLOWSHIP: 'Compagnie',
        MANEUVER: 'Manœuvre',
        REGROUP: 'Ralliement',
        SHADOW: 'Ombre',
        SKIRMISH: 'Combat',
        RESPONSE: 'Réponse',

        // Classes / Équipements
        ARMOR: 'Armure',
        BOX: 'Boîte',
        BRACERS: 'Brassards',
        BROOCH: 'Broche',
        CLOAK: 'Cape',
        EVENT: 'Événement',
        GAUNTLETS: 'Gantelets',
        'HAND-WEAPON': 'Arme de Mêlée',
        HELM: 'Heaume',
        MOUNT: 'Monture',
        PALANTIR: 'Palantir',
        PHIAL: 'Fiole',
        PIPE: 'Pipe',
        'RANGED-WEAPON': 'Arme à Distance',
        RING: 'Anneau',
        SHIELD: 'Bouclier',
        STAFF: 'Bâton',
        'THE-ONE-RING': "L'Anneau Unique",
    } as Record<string, string>,

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
        DUNLAND: 'Pays de Dun',
        DWARVEN: 'Nain',
        ELVEN: 'Elfe',
        GANDALF: 'Gandalf',
        GOLLUM: 'Gollum',
        GONDOR: 'Gondor',
        ISENGARD: 'Isengard',
        MEN: 'Hommes',
        MORIA: 'Moria',
        ORC: 'Orque',
        RAIDER: 'Pillards',
        RAITH: 'Spectre',
        ROHAN: 'Rohan',
        SAURON: 'Sauron',
        SHIRE: 'Comté',
        'THE-ONE-RING': "L'Anneau Unique",
        'URUK-HAI': 'Uruk-hai',
    } as Record<CardCulture, string>,

    keyword: {
        AID: {
            label: 'Aide',
            description:
                "Au début de la phase de manoeuvre, vous pouvez payer le coût indiqué sur la carte pour attacher le suivant à un compagnon ou un séide jusqu'à la phase de ralliement, et bénéficier de ses effets.",
        },
        AMBUSH: {
            label: 'Embuscade X',
            description:
                "X est ajouté à la réserve crépusculaire si le joueur des Peuples Libres affecte le séide avec ce mot-clé lors de la phase d'affectation.",
        },
        ARCHER: {
            label: 'Archer',
            description: "Ce personnage augmente de 1 le total d'archerie.",
        },
        BATTLEGROUND: {
            label: 'Champ de Bataille',
            description: unloadKeyword,
        },
        BESIEGER: {
            label: 'Assiégeant',
            description: unloadKeyword,
        },
        CORSAIR: {
            label: 'Pirate',
            description: unloadKeyword,
        },
        DAMAGE: {
            label: 'Dégâts + X',
            description:
                'Le personnage inflige X blessures supplémentaires en combat',
        },
        DEFENDER: {
            label: 'Défenseur + X',
            description:
                "Le personnage peut être affecté à X séide supplémentaires pendant la phase d'affectation.",
        },
        DWELLING: {
            label: 'Résidence',
            description: unloadKeyword,
        },
        EASTERLING: {
            label: 'Oriental',
            description: unloadKeyword,
        },
        ENDURING: {
            label: 'Pugnace',
            description:
                'Pour chaque blessure sur ce personnage, il a + 2 en Force.',
        },
        ENGINE: {
            label: 'Engin',
            description: unloadKeyword,
        },
        FIERCE: {
            label: 'Acharné',
            description:
                'Après la résolution de tous les combats, ce séide doit être affecté de nouveau à un personnage pour participer à un nouveau combat.',
        },
        FOREST: {
            label: 'Forêt',
            description: unloadKeyword,
        },
        FORTIFICATION: {
            label: 'Fortification',
            description: unloadKeyword,
        },
        HUNTER: {
            label: 'Chasseur X',
            description:
                "Ce personnage a + X en Force s'il combat un adversaire sans le mot-clé Chasseur.",
        },
        KNIGHT: {
            label: 'Chevalier',
            description: unloadKeyword,
        },
        LURKER: {
            label: 'Embusqué',
            description:
                'Les combats impliquant des séides avec ce mot-clé doivent être résolus en dernier.',
        },
        MACHINE: {
            label: 'Machine',
            description: unloadKeyword,
        },
        MARSH: {
            label: 'Marais',
            description: unloadKeyword,
        },
        MOUNTAIN: {
            label: 'Montagne',
            description: unloadKeyword,
        },
        MUSTER: {
            label: 'Rassembleur',
            description:
                "Au début de la phase de Ralliement, chaque joueur peut défaisser un nombre de cartes égal au nombre de personnages Rassembleurs qu'ils possèdent, puis piocher le même nombre de cartes.",
        },
        PIPEWEED: {
            label: 'Herbe à pipe',
            description: unloadKeyword,
        },
        PLAINS: {
            label: 'Plaines',
            description: unloadKeyword,
        },
        RANGER: {
            label: 'Rôdeur',
            description: unloadKeyword,
        },
        'RING-BEARER': {
            label: "Porteur de l'Anneau",
            description: "Ce personnage peut porter l'Anneau Unique.",
        },
        'RING-BOUND': {
            label: "Associé à l'Anneau",
            description: unloadKeyword,
        },
        RIVER: {
            label: 'Rivière',
            description: unloadKeyword,
        },
        SEARCH: {
            label: 'Recherche',
            description: unloadKeyword,
        },
        SOUTHRON: {
            label: 'Suderon',
            description: unloadKeyword,
        },
        SPELL: {
            label: 'Sort',
            description: unloadKeyword,
        },
        STEALTH: {
            label: 'Dissimulation',
            description: unloadKeyword,
        },
        TALE: {
            label: 'Récit',
            description: unloadKeyword,
        },
        TENTACLE: {
            label: 'Tentacule',
            description: unloadKeyword,
        },
        TOIL: {
            label: 'Éreintement X',
            description:
                'Pour chaque personnage différent (de la même culture que la carte avec Éreintement) affaibli, le coût de la carte est réduit de X.',
        },
        TRACKER: {
            label: 'Traqueur',
            description: unloadKeyword,
        },
        TWILIGHT: {
            label: 'Crépusculaire',
            description: unloadKeyword,
        },
        UNDERGROUND: {
            label: 'Souterrain',
            description: unloadKeyword,
        },
        UNHASTY: {
            label: 'Peu hâtif',
            description:
                'Les Ents avec ce mot-clé ne peuvent pas participer au combat, sauf si le combat a lieu sur leur site natif, ou si un effet les autorise expressément.',
        },
        VALIANT: {
            label: 'Vaillant',
            description: unloadKeyword,
        },
        VILLAGER: {
            label: 'Villageois',
            description: unloadKeyword,
        },
        'WARG-RIDER': {
            label: 'Chevaucheur de ouague',
            description: unloadKeyword,
        },
        WEATHER: {
            label: 'Climat',
            description: unloadKeyword,
        },
    } as Record<CardKeyword, KeywordData>,
};
