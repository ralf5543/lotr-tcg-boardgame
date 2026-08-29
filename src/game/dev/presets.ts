import type { GameState } from '../types';
import type { DevPresetType } from '../types';
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
        keywords: ['RING-BOUND', 'RING-BEARER', 'MUSTER'],
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
    EOWYN: {
        id: '4C270',
        set: 4,
        rarity: 'C',
        isUnique: true,
        isFemale: true,
        kind: 'FREE_PEOPLE',
        type: 'COMPANION',
        keywords: ['VALIANT', 'HUNTER 4'],
        phases: ['RESPONSE'],
        culture: 'ROHAN',
        race: 'MAN',
        signet: 'THEODEN',
        twilightCost: 2,
        strength: 6,
        vitality: 3,
        imageUrl: '/cards_visuals/o_04_270.jpg',
        i18n: {
            en: {
                title: 'Éowyn',
                subtitle: 'Lady of Rohan',
                gameText:
                    '**Valiant.**\n**Response:** If an unbound companion is about to take a wound, exert Éowyn and add <symbol>twilight1</symbol> to prevent that wound.',
                loreText:
                    'Thus Aragorn... beheld Éowyn... and thought her fair, fair and cold, like a morning of pale spring that is not yet come to womanhood.',
            },
            fr: {
                title: 'Éowyn',
                subtitle: 'Dame de Rohan',
                gameText:
                    '**Vaillant.**\n**Réponse :** Si un compagnon dissocié est sur le point d’être blessé, affaiblissez Éowyn et ajoutez <symbol>twilight1</symbol> pour empêcher cette blessure.',
                loreText:
                    "C'est ainsi qu'Aragorn vit pour la première fois... Éowyn, Dame de Rohan, et il la trouva belle, belle et froide, comme un pâle matin de printemps, non encore parvenue à la plénitude de la femme.",
            },
        },
    },
    SMEAGOL: {
        id: '7R71',
        set: 7,
        rarity: 'R',
        isUnique: true,
        kind: 'FREE_PEOPLE',
        type: 'COMPANION',
        keywords: ['RING-BOUND'],
        phases: ['ASSIGNMENT'],
        culture: 'GOLLUM',
        signet: 'FRODO',
        twilightCost: 0,
        strength: 3,
        vitality: 4,
        imageUrl: '/cards_visuals/o_07_071.jpg',
        i18n: {
            en: {
                title: 'Sméagol',
                subtitle: 'Always Helps',
                gameText:
                    '**Ring-bound.** To play, add a burden. \n**Assignment:** Assign a minion to Sméagol and add 2 threats to exhaust that minion.',
            },
            fr: {
                title: 'Sméagol',
                subtitle: 'Always Helps',
                gameText:
                    '**Ring-bound.** To play, add a burden. \n**Assignment:**: Assign a minion to Sméagol and add 2 threats to exhaust that minion.',
            },
        },
    },
    ARAGORN: {
        id: '4C109',
        set: 4,
        rarity: 'C',
        isUnique: true,
        kind: 'FREE_PEOPLE',
        type: 'COMPANION',
        keywords: ['DEFENDER +2', 'UNBOUND', 'HUNTER 1'],
        culture: 'GONDOR',
        race: 'MAN',
        signet: 'GANDALF',
        twilightCost: 4,
        strength: 8,
        vitality: 4,
        imageUrl: '/cards_visuals/o_04_109.jpg',
        i18n: {
            en: {
                title: 'Aragorn',
                subtitle: 'Heir of Elendil',
                gameText: '**Defender +1.**',
                loreText:
                    'Sauron fears you, Aragorn, he fears what you may become.',
            },
            fr: {
                title: 'Aragorn',
                subtitle: "Héritier d'Elendil",
                gameText: '**Défenseur +1.**',
                loreText:
                    'Sauron te craint, Aragorn, Il craint ce que tu pourrais devenir.',
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
        keywords: ['HUNTER 1'],
        race: 'ORC',
        twilightCost: 2,
        strength: 5,
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
        keywords: ['LURKER'],
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
    NAZGUL: {
        id: '7R210',
        set: 7,
        rarity: 'R',
        isUnique: true,
        kind: 'SHADOW',
        type: 'MINION',
        keywords: ['FIERCE'],
        actionPhases: ['SHADOW'],
        culture: 'WRAITH',
        race: 'NAZGÛL',
        twilightCost: 6,
        strength: 12,
        vitality: 3,
        minionSiteNumber: 3,
        imageUrl: '/cards_visuals/o_07_210.jpg',
        i18n: {
            en: {
                title: 'Úlairë Attëa',
                subtitle: 'Wraith on Wings',
                gameText:
                    '**Fierce.** \n**Shadow:** If you have initiative, exert Úlairë Attëa and spot another <symbol>wraith</symbol> minion to add a burden.',
            },
            fr: {
                title: 'Úlairë Attëa',
                subtitle: 'Wraith on Wings',
                gameText:
                    '**Fierce.** \n**Shadow:** If you have initiative, exert Úlairë Attëa and spot another <symbol>wraith</symbol> minion to add a burden.',
            },
            
        },
    },
    ARMOR: {
        id: '1C92',
        set: 1,
        rarity: 'C',
        isUnique: false,
        kind: 'FREE_PEOPLE',
        type: 'POSSESSION',
        subtype: 'ARMOR',
        culture: 'DWARVEN',
        twilightCost: 2,
        vitality: 1, // Bonus de +1 en Vitalité lorsqu'elle est attachée
        imageUrl: '/cards_visuals/o_01_092.jpg',
        i18n: {
            en: {
                title: 'Armor',
                gameText: 'Bearer gains **vitality +1**.',
                loreText:
                    'Dwarf-mail was light and yet stronger than forged steel.',
            },
            fr: {
                title: 'Armure',
                gameText: 'Le porteur gagne **vitalité +1**.',
                loreText:
                    "La cotte de mailles naine était légère et pourtant plus solide que l'acier forgé.",
            },
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
                    drawCardsForPlayer(G, player, 8, false);
                }
            });

            // Gimli avec l'armure attachée (+1 Vitalité)
            const gimliWithArmor = {
                ...CARDS_PRESETS.GIMLI,
                attachments: [{ ...CARDS_PRESETS.ARMOR }],
            };

            fpPlayer.fellowshipArea = [
                { ...CARDS_PRESETS.FRODO },
                { ...CARDS_PRESETS.ARAGORN },
                { ...CARDS_PRESETS.SMEAGOL },
                { ...CARDS_PRESETS.LEGOLAS },
                gimliWithArmor,
                { ...CARDS_PRESETS.EOWYN },
            ];

            G.battlefield = [
                { ...CARDS_PRESETS.LURTZ },
                { ...CARDS_PRESETS.MORIA_SCOUT },
                { ...CARDS_PRESETS.ORC_SOLDIER },
                { ...CARDS_PRESETS.NAZGUL },
            ];

            // Initialisation propre de l'état d'archerie
            G.archeryWoundsToAssign = 0;
            if (G.archeryState) {
                G.archeryState.fpTotal = 0;
                G.archeryState.fpRemainingWounds = 0;
            }

            G.statusMessage =
                '[DEV] Preset Archerie chargé (Gimli a +1 Vitalité via Armure)';
            break;
        }
    }
};
