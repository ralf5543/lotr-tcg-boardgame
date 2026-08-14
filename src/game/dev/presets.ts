import type { GameState } from '../types';
import type { DevPresetType } from '../moves';
import type { CardState } from '../types';
import { drawCardsForPlayer } from '../../utils/drawCards';

const CARDS_PRESETS: Record<string, CardState> = {
    FRODO: {
        id: '2C102',
        set: 2,
        rarity: 'C',
        isUnique: true,
        kind: 'FREE_PEOPLE',
        type: 'COMPANION',
        keywords: ['RING-BOUND', 'RING-BEARER'],
        culture: 'SHIRE',
        race: 'HOBBIT',
        signet: 'ARAGORN',
        twilightCost: 0,
        strength: 3,
        vitality: 4,
        resistance: 10,
        imageUrl: '/cards_visuals/o_02_102.jpg',
        i18n: {
            en: {
                title: 'Frodo',
                subtitle: 'Reluctant Adventurer',
                gameText:
                    '**Ring-bound.** **Ring-bearer** (resistance 10).  \nThe cost of each artifact, possession, and <symbol>shire</symbol> tale played on Frodo is -1.',
                loreText:
                    'I am not made for perilous quests. I wish I had never seen the Ring! Why did it come to me? Why was I chosen?',
            },
            fr: {
                title: 'Frodon',
                subtitle: 'Aventurier Malgré Lui',
                gameText:
                    '**Porteur de l’Anneau (résistance 10).** Le coût de chaque artefact, possession et récit <symbol>shire</symbol> joué sur Frodon est de -1.',
                loreText:
                    "Je ne suis pas fait pour les quêtes périlleuses. Je voudrais bien n'avoir jamais vu l'Anneau! Pourquoi m'est-il venu? Pourquoi ai-je été choisi?",
            },
        },
    },
    LEGOLAS: {
        id: '0P13',
        set: 0,
        rarity: 'P',
        isUnique: true,
        kind: 'FREE_PEOPLE',
        type: 'COMPANION',
        keywords: ['ARCHER'],
        phases: ['ARCHERY'],
        culture: 'ELVEN',
        race: 'ELF',
        signet: 'FRODO',
        twilightCost: 2,
        strength: 6,
        vitality: 3,
        imageUrl: '/cards_visuals/o_00_013.jpg',
        i18n: {
            en: {
                title: 'Legolas',
                subtitle: 'Greenleaf',
                gameText:
                    '**Archer.** \n**Archery:** Exert Legolas to wound a minion; Legolas does not add to the fellowship archery total.',
                loreText:
                    'If we are quick we shall catch Frodo and Sam before nightfall.',
            },
            fr: {
                title: 'Legolas',
                subtitle: 'Vertefeuille',
                gameText:
                    '**Archer.**\n**Archerie :** Affaiblissez Legolas pour blesser un séide ; Legolas ne s’ajoute pas au total d’archerie de la compagnie.',
                loreText:
                    "Moi aussi, j'irai avec lui' dit Legolas. ‘Il serait déloyal de lui dire maintenant adieu.",
            },
        },
    },
    GIMLI: {
        id: '0P12',
        set: 0,
        rarity: 'P',
        isUnique: true,
        kind: 'FREE_PEOPLE',
        type: 'COMPANION',
        keywords: ['DAMAGE +1'],
        phases: ['SKIRMISH'],
        culture: 'DWARVEN',
        race: 'DWARF',
        signet: 'GANDALF',
        twilightCost: 2,
        strength: 6,
        vitality: 3,
        imageUrl: '/cards_visuals/o_00_012.jpg',
        i18n: {
            en: {
                title: 'Gimli',
                subtitle: 'Son of Glóin',
                gameText:
                    '**Damage +1.**. \n**Skirmish:** Exert Gimli to make him strength +2.',
                loreText:
                    'Then it has all been in vain – the Fellowship has failed.',
            },
            fr: {
                title: 'Gimli',
                subtitle: 'Fils de Glóin',
                gameText:
                    '**Dégâts +1.**\n**Combat :** Affaiblissez Gimli pour lui donner +2 en force.',
                loreText:
                    'À côté de Glóin se trouvait un jeune Nain: son fils Gimli.',
            },
        },
    },
    LURTZ: {
        id: '11R194',
        set: 11,
        rarity: 'R',
        isUnique: true,
        kind: 'SHADOW',
        type: 'MINION',
        keywords: ['ARCHER', 'DAMAGE +1', 'MUSTER'],
        culture: 'URUK-HAI',
        race: 'URUK-HAI',
        twilightCost: 7,
        strength: 13,
        vitality: 3,
        minionSiteNumber: 5,
        imageUrl: '/cards_visuals/o_11_194.jpg',
        i18n: {
            en: {
                title: 'Lurtz',
                subtitle: 'Minion of the White Wizard',
                gameText:
                    '**Archer.** **Damage +1.** **Muster.** (At the start of the regroup phase, you may discard a card from hand to draw a card.) Lurtz is strength +3 for each exhausted companion you can spot.',
                loreText:
                    'Saruman bred this ruthless commander, whose brutality matched his own ambition, to track the Nine Walkers.',
            },
            fr: {
                title: 'Lurtz',
                subtitle: 'Minion of the White Wizard',
                gameText:
                    '**Archer.** **Damage +1.** **Muster.** (At the start of the regroup phase, you may discard a card from hand to draw a card.) Lurtz is strength +3 for each exhausted companion you can spot.',
                loreText:
                    'Saruman bred this ruthless commander, whose brutality matched his own ambition, to track the Nine Walkers.',
            },
        },
    },
    MORIA_SCOUT: {
        id: '1C191',
        set: 1,
        rarity: 'C',
        isUnique: false,
        kind: 'SHADOW',
        type: 'MINION',
        culture: 'MORIA',
        race: 'ORC',
        twilightCost: 2,
        strength: 6,
        vitality: 2,
        minionSiteNumber: 4,
        imageUrl: '/cards_visuals/o_01_191.jpg',
        i18n: {
            en: {
                title: 'Moria Scout',
                gameText:
                    'When you play this minion, spot an Elf to add <symbol>twilight2</symbol>.',
                loreText:
                    'Like their kindred in the North, the Orcs of Moria have keen noses, often following their prey by scent.',
            },
            fr: {
                title: 'Éclaireur de la Moria',
                gameText:
                    'Quand vous jouez ce séide, désignez un Elfe pour ajouter <symbol>twilight2</symbol>.',
                loreText:
                    "Comme leurs cousins du Nord, les Orques de la Moria ont des nez fins, pistant souvent leur proie à l'odeur.",
            },
        },
    },
    ORC_SOLDIER: {
        id: '1C271',
        set: 1,
        rarity: 'C',
        isUnique: false,
        kind: 'SHADOW',
        type: 'MINION',
        phases: ['SKIRMISH'],
        culture: 'SAURON',
        race: 'ORC',
        twilightCost: 2,
        strength: 7,
        vitality: 2,
        minionSiteNumber: 6,
        imageUrl: '/cards_visuals/o_01_271.jpg',
        i18n: {
            en: {
                title: 'Orc Soldier',
                gameText:
                    '**Skirmish:** Exert this minion to wound a character he is skirmishing.',
                loreText:
                    'Bearing cruel weapons, Orcs go forth from Mordor to serve the Eye.',
            },
            fr: {
                title: 'Soldat Orque',
                gameText:
                    '**Combat :** Affaiblissez ce séide pour blesser un personnage qu’il combat.',
                loreText:
                    "Porteurs d'armes cruelles, les Orques sortent du Mordor pour servir l'*il.",
            },
        },
    },
    HORROR_HARAD: {
        id: '14R13',
        set: 14,
        rarity: 'R',
        isUnique: true,
        kind: 'SHADOW',
        type: 'MINION',
        "keywords": [
            "AMBUSH 1",
            "DAMAGE +1",
            "FIERCE",
            "LURKER",
            "MUSTER",
            "TOIL 2"
        ],
        culture: 'ORC',
        race: 'HALF-TROLL',
        twilightCost: 4,
        strength: 9,
        vitality: 3,
        minionSiteNumber: 4,
        imageUrl: '/cards_visuals/o_14_013.jpg',
        i18n: {
            en: {
                title: 'Horror of Harad',
                gameText:
                    '**Ambush** <symbol>twilight1</symbol>**. Damage +1. Fierce. Lurker. Muster. Toil 2.**',
                loreText:
                    'The troll-men sprinted on to the Pelennor to bathe their blades in the blood of the enemy.',
            },
            fr: {
                title: 'Horror of Harad',
                gameText:
                    '**Ambush** <symbol>twilight1</symbol>**. Damage +1. Fierce. Lurker. Muster. Toil 2.**',
                loreText:
                    'The troll-men sprinted on to the Pelennor to bathe their blades in the blood of the enemy.',
            }
        },
    },
};

export const applyDevPreset = (
    G: GameState,
    presetType: DevPresetType
): void => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) return;

    switch (presetType) {
        case 'ARCHERY_TEST': {
            G.twilightPool = 8;
            fpPlayer.burdens = 3;

            Object.keys(G.players).forEach((pId) => {
                const player = G.players[pId];
                if (player) {
                    player.hand = [];
                    drawCardsForPlayer(G, player, 4, false);
                }
            });

            // On passe des copies d'objets pour éviter tout problème de référence partagée
            fpPlayer.fellowshipArea = [
                { ...CARDS_PRESETS.FRODO },
                { ...CARDS_PRESETS.LEGOLAS },
                { ...CARDS_PRESETS.GIMLI },
            ];

            G.battlefield = [
                { ...CARDS_PRESETS.LURTZ },
                { ...CARDS_PRESETS.MORIA_SCOUT },
                { ...CARDS_PRESETS.ORC_SOLDIER },
                { ...CARDS_PRESETS.HORROR_HARAD },
            ];

            G.statusMessage = '[DEV] Preset Archerie chargé';
            break;
        }
    }
};
