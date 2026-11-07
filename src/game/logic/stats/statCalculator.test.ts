import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from './statCalculator';
import { getEnduringStrengthBonus } from './mechanics/enduringModifier';
import { getHunterStrengthBonus } from './mechanics/hunterModifier';
import {
    getEffectiveResistance,
    getEffectiveVitality,
} from '../../../utils/cardStats';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from '../../testing/createGameState';

describe('ENDURING', () => {
    it('donne +2 de force par blessure', () => {
        const card = createCompanion({
            id: 'troll',
            keywords: ['ENDURING'],
            strength: 3,
            wounds: 2,
        });

        expect(getEnduringStrengthBonus(card)).toBe(4);
        expect(getCalculatedStrength(undefined, card)).toBe(7);
        expect(
            getEnduringStrengthBonus(createCompanion({ id: 'plain', wounds: 2 }))
        ).toBe(0);
    });
});

describe('HUNTER', () => {
    it('s’active seulement contre un adversaire sans HUNTER', () => {
        const hunter = createCompanion({
            id: 'comp-1',
            keywords: ['HUNTER 1'],
            strength: 4,
        });
        const prey = createMinion({ id: 'orc', strength: 4 });
        const otherHunter = createMinion({
            id: 'hunter-orc',
            keywords: ['HUNTER 1'],
            strength: 4,
        });

        const vsPrey = createGameState({
            battlefield: [prey],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [hunter] }),
            },
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'comp-1',
                    minionIds: ['orc'],
                },
            ],
        });

        expect(getHunterStrengthBonus(vsPrey, hunter, vsPrey.skirmishes[0])).toBe(
            1
        );
        expect(getCalculatedStrength(vsPrey, hunter)).toBe(5);

        const vsHunter = createGameState({
            battlefield: [otherHunter],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [hunter] }),
            },
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'comp-1',
                    minionIds: ['hunter-orc'],
                },
            ],
        });

        expect(
            getHunterStrengthBonus(vsHunter, hunter, vsHunter.skirmishes[0])
        ).toBe(0);
        expect(getCalculatedStrength(vsHunter, hunter)).toBe(4);
    });
});

describe('tempModifiers', () => {
    it('ajoute le bonus de force ciblé pendant l’escarmouche', () => {
        const companion = createCompanion({ id: 'comp-1', strength: 4 });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [companion],
                }),
            },
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'comp-1',
                    minionIds: ['orc'],
                },
            ],
            tempModifiers: [
                {
                    id: 'event-1',
                    targetCardId: 'comp-1',
                    stat: 'STRENGTH',
                    value: 3,
                    scope: 'SKIRMISH',
                },
            ],
        });

        expect(getCalculatedStrength(G, companion)).toBe(7);
    });

    it('Sting : résistance +2 via tempModifiers', () => {
        const companion = createCompanion({
            id: 'sam-1',
            resistance: 5,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [companion],
                    burdens: 0,
                }),
            },
            tempModifiers: [
                {
                    id: 'sting-1',
                    targetCardId: 'sam-1',
                    stat: 'RESISTANCE',
                    value: 2,
                    scope: 'PHASE',
                    expiresAtPhase: 'REGROUP',
                },
            ],
        });

        expect(getEffectiveResistance(companion, 0, G)).toBe(7);
    });
});

describe('While you can spot → strength', () => {
    it('Gandalf : +3 force dès 3 crépuscule', () => {
        const gandalf = createCompanion({
            id: '4C90',
            title: 'Gandalf',
            strength: 7,
            abilities: [
                {
                    id: '4C90:0',
                    phases: [],
                    trigger: { type: 'WHILE', spotTwilight: 3 },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 3,
                            target: 'SELF',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });

        const low = createGameState({
            twilightPool: 2,
            players: {
                '0': createPlayerState('0', { fellowshipArea: [gandalf] }),
            },
        });
        expect(getCalculatedStrength(low, gandalf)).toBe(7);

        const high = createGameState({
            twilightPool: 3,
            players: {
                '0': createPlayerState('0', { fellowshipArea: [gandalf] }),
            },
        });
        expect(getCalculatedStrength(high, gandalf)).toBe(10);
    });

    it('Morgul Cur : +2 force si un Nazgûl est en jeu', () => {
        const cur = createMinion({
            id: '7C189',
            title: 'Morgul Cur',
            race: 'ORC',
            culture: 'SAURON',
            strength: 8,
            abilities: [
                {
                    id: '7C189:0',
                    phases: [],
                    trigger: {
                        type: 'WHILE',
                        spot: [{ count: 1, target: [['NAZGÛL']] }],
                    },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: 'SELF',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const nazgul = createMinion({
            id: 'nazgul',
            race: 'NAZGÛL',
            culture: 'WRAITH',
            strength: 12,
        });

        const alone = createGameState({
            battlefield: [cur],
            players: { '1': createPlayerState('1') },
        });
        expect(getCalculatedStrength(alone, cur)).toBe(8);

        const withNazgul = createGameState({
            battlefield: [cur, nazgul],
            players: { '1': createPlayerState('1') },
        });
        expect(getCalculatedStrength(withNazgul, cur)).toBe(10);
    });

    it('Elven Defender : +2 si jeton elven spoté', () => {
        const defender = createCompanion({
            id: '18C9',
            title: 'Elven Defender',
            culture: 'ELVEN',
            strength: 6,
            abilities: [
                {
                    id: '18C9:0',
                    phases: [],
                    trigger: {
                        type: 'WHILE',
                        spotCultureTokens: { culture: 'ELVEN', count: 1 },
                    },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: 'SELF',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const tokenCard = createCard({
            id: 'token-holder',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            culture: 'ELVEN',
            cultureTokens: { ELVEN: 1 },
        });

        const without = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [defender],
                }),
            },
        });
        expect(getCalculatedStrength(without, defender)).toBe(6);

        const withToken = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [defender],
                    supportArea: [tokenCard],
                }),
            },
        });
        expect(getCalculatedStrength(withToken, defender)).toBe(8);
    });

    it('Assault Denizen : +1 par jeton Free Peoples spoté', () => {
        const denizen = createMinion({
            id: '13C159',
            title: 'Assault Denizen',
            strength: 8,
            abilities: [
                {
                    id: '13C159:0',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: 'SELF',
                            perCultureTokens: { culture: 'FREE_PEOPLES' },
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const holder = createCard({
            id: 'garrison',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            culture: 'GONDOR',
            cultureTokens: { GONDOR: 2 },
        });

        const bare = createGameState({
            battlefield: [denizen],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(bare, denizen)).toBe(8);

        const withTokens = createGameState({
            battlefield: [denizen],
            players: {
                '0': createPlayerState('0', { supportArea: [holder] }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(withTokens, denizen)).toBe(10);
    });

    it('Assault Denizen : ignore les jetons Ombre (ORC)', () => {
        const denizen = createMinion({
            id: '13C159',
            strength: 9,
            abilities: [
                {
                    id: '13C159:0',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: 'SELF',
                            perCultureTokens: { culture: 'FREE_PEOPLES' },
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const G = createGameState({
            battlefield: [denizen],
            players: {
                '0': createPlayerState('0', {
                    supportArea: [
                        createCard({
                            id: 'garrison',
                            kind: 'FREE_PEOPLE',
                            type: 'CONDITION',
                            subtype: 'SUPPORT-AREA',
                            culture: 'GONDOR',
                            cultureTokens: { GONDOR: 2 },
                        }),
                        createCard({
                            id: 'run',
                            kind: 'FREE_PEOPLE',
                            type: 'CONDITION',
                            subtype: 'SUPPORT-AREA',
                            culture: 'DWARVEN',
                            cultureTokens: { DWARVEN: 2 },
                        }),
                    ],
                }),
                '1': createPlayerState('1', {
                    supportArea: [
                        createCard({
                            id: 'always',
                            kind: 'SHADOW',
                            type: 'CONDITION',
                            subtype: 'SUPPORT-AREA',
                            culture: 'ORC',
                            cultureTokens: { ORC: 3 },
                        }),
                    ],
                }),
            },
        });
        // 9 + 4 Free Peoples (pas les 3 ORC)
        expect(getCalculatedStrength(G, denizen)).toBe(13);
    });

    it('Ma hache / Décompte final : +min(jetons croisés), limite +3', () => {
        const gimli = createCompanion({
            id: 'gimli',
            title: 'Gimli',
            strength: 6,
        });
        const myAxe = createCard({
            id: '4R52',
            title: 'My Axe Is Notched',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            culture: 'DWARVEN',
            cultureTokens: { DWARVEN: 2 },
            abilities: [
                {
                    id: '4R52:1',
                    phases: [],
                    trigger: {
                        type: 'WHILE',
                        matchingTokensOnNamedCard: {
                            selfCulture: 'DWARVEN',
                            otherCulture: 'ELVEN',
                            otherCardTitle: 'Final Count',
                        },
                    },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: [['Gimli']],
                            perMatchingTokensOnNamedCard: {
                                selfCulture: 'DWARVEN',
                                otherCulture: 'ELVEN',
                                otherCardTitle: 'Final Count',
                                limit: 3,
                            },
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const finalCount = createCard({
            id: '4R69',
            title: 'Final Count',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            subtype: 'SUPPORT-AREA',
            culture: 'ELVEN',
            cultureTokens: { ELVEN: 2 },
        });

        const alone = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gimli],
                    supportArea: [myAxe],
                }),
            },
        });
        expect(getCalculatedStrength(alone, gimli)).toBe(6);

        const paired = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gimli],
                    supportArea: [myAxe, finalCount],
                }),
            },
        });
        expect(getCalculatedStrength(paired, gimli)).toBe(8);

        const capped = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gimli],
                    supportArea: [
                        { ...myAxe, cultureTokens: { DWARVEN: 5 } },
                        { ...finalCount, cultureTokens: { ELVEN: 5 } },
                    ],
                }),
            },
        });
        expect(getCalculatedStrength(capped, gimli)).toBe(9); // +3 limite
    });

    it('Man of Bree : +1 par carte en main FP', () => {
        const bree = createMinion({
            id: '11S90',
            title: 'Man of Bree',
            strength: 8,
            abilities: [
                {
                    id: '11S90:0',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: 'SELF',
                            perCardsInHand: { whose: 'FREE_PEOPLES' },
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const emptyHand = createGameState({
            battlefield: [bree],
            players: {
                '0': createPlayerState('0', { hand: [] }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(emptyHand, bree)).toBe(8);

        const threeCards = createGameState({
            battlefield: [bree],
            players: {
                '0': createPlayerState('0', {
                    hand: [
                        createCard({ id: 'h1', type: 'EVENT' }),
                        createCard({ id: 'h2', type: 'EVENT' }),
                        createCard({ id: 'h3', type: 'EVENT' }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(threeCards, bree)).toBe(11);
    });

    it('Gimli Faithful Companion : +2 si le propriétaire a l’initiative', () => {
        const gimli = createCompanion({
            id: '7C6',
            title: 'Gimli',
            strength: 6,
            abilities: [
                {
                    id: '7C6:0',
                    phases: [],
                    trigger: { type: 'WHILE', hasInitiative: true },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: 'SELF',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });

        const noInit = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gimli],
                    hand: [
                        createCard({ id: 'h1', type: 'EVENT' }),
                        createCard({ id: 'h2', type: 'EVENT' }),
                        createCard({ id: 'h3', type: 'EVENT' }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(noInit, gimli)).toBe(6);

        const withInit = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gimli],
                    hand: [
                        createCard({ id: 'h1', type: 'EVENT' }),
                        createCard({ id: 'h2', type: 'EVENT' }),
                        createCard({ id: 'h3', type: 'EVENT' }),
                        createCard({ id: 'h4', type: 'EVENT' }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(withInit, gimli)).toBe(8);
    });

    it('Gandalf Leader of the Company : force selon la région', () => {
        const gandalf = createCompanion({
            id: '11S33',
            title: 'Gandalf',
            strength: 7,
            instanceId: 'gandalf',
            abilities: [
                {
                    id: '11S33:0',
                    phases: [],
                    trigger: { type: 'WHILE', inRegion: 1 },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: [['COMPANION']],
                            excludeSource: true,
                        },
                    ],
                    source: 'SELF',
                },
                {
                    id: '11S33:1',
                    phases: [],
                    trigger: { type: 'WHILE', inRegion: 2 },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: [['COMPANION']],
                        },
                    ],
                    source: 'SELF',
                },
                {
                    id: '11S33:2',
                    phases: [],
                    trigger: { type: 'WHILE', inRegion: 3 },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: 'SELF',
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            strength: 3,
            instanceId: 'frodo',
        });

        const region1 = createGameState({
            currentSiteIndex: 0,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf, frodo],
                    currentSiteIndex: 0,
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(region1, gandalf)).toBe(7); // other only
        expect(getCalculatedStrength(region1, frodo)).toBe(5); // +2

        const region2 = createGameState({
            currentSiteIndex: 3,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf, frodo],
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(region2, gandalf)).toBe(8); // +1
        expect(getCalculatedStrength(region2, frodo)).toBe(4); // +1

        const region3 = createGameState({
            currentSiteIndex: 6,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf, frodo],
                    currentSiteIndex: 6,
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(region3, gandalf)).toBe(9); // +2 self
        expect(getCalculatedStrength(region3, frodo)).toBe(3); // rien
    });

    it('Little Golden Flower : vit / rés / force selon attachements', () => {
        const flower = createCard({
            id: '15R148',
            title: 'Little Golden Flower',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            abilities: [
                {
                    id: '15R148:0',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'VITALITY',
                            value: 1,
                            target: [['HOBBIT']],
                            bearing: [['HAND-WEAPON']],
                        },
                    ],
                    source: 'SELF',
                },
                {
                    id: '15R148:1',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'RESISTANCE',
                            value: 1,
                            target: [['HOBBIT']],
                            bearing: [['FOLLOWER']],
                        },
                    ],
                    source: 'SELF',
                },
                {
                    id: '15R148:2',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: [['UNWOUNDED', 'HOBBIT']],
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const sword = createCard({
            id: 'sword',
            type: 'POSSESSION',
            subtype: 'HAND-WEAPON',
            instanceId: 'sword',
        });
        const follower = createCard({
            id: 'follower',
            type: 'FOLLOWER',
            instanceId: 'follower',
        });
        const armed = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            race: 'HOBBIT',
            strength: 3,
            vitality: 4,
            resistance: 10,
            attachments: [sword],
            instanceId: 'frodo',
        });
        const withFollower = createCompanion({
            id: 'sam',
            title: 'Sam',
            race: 'HOBBIT',
            strength: 3,
            vitality: 4,
            resistance: 5,
            attachments: [follower],
            instanceId: 'sam',
        });
        const wounded = createCompanion({
            id: 'pippin',
            title: 'Pippin',
            race: 'HOBBIT',
            strength: 3,
            vitality: 4,
            wounds: 1,
            instanceId: 'pippin',
        });

        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [armed, withFollower, wounded],
                    supportArea: [flower],
                }),
            },
        });

        expect(getCalculatedStrength(G, armed)).toBe(4);
        expect(getEffectiveVitality(armed, G)).toBe(5);
        expect(getEffectiveResistance(withFollower, 0, G)).toBe(6);
        expect(getCalculatedStrength(G, withFollower)).toBe(4);
        expect(getCalculatedStrength(G, wounded)).toBe(3);
    });

    it('A Promise : +1 Frodo et Sam tant qu’aucun n’est épuisé', () => {
        const promise = createCard({
            id: '12R128',
            title: 'A Promise',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            abilities: [
                {
                    id: '12R128:0',
                    phases: [],
                    trigger: {
                        type: 'WHILE',
                        spot: [
                            { count: 1, target: [['Frodo', 'NOT_EXHAUSTED']] },
                            { count: 1, target: [['Sam', 'NOT_EXHAUSTED']] },
                        ],
                    },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: [['Frodo'], ['Sam']],
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const frodo = createCompanion({
            id: '2C102',
            title: 'Frodo',
            strength: 3,
            vitality: 4,
            wounds: 0,
            instanceId: 'frodo',
        });
        const sam = createCompanion({
            id: '10P122',
            title: 'Sam',
            strength: 3,
            vitality: 4,
            wounds: 0,
            instanceId: 'sam',
        });
        const merry = createCompanion({
            id: '1C303',
            title: 'Merry',
            strength: 3,
            vitality: 3,
            instanceId: 'merry',
        });

        const ok = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, sam, merry],
                    supportArea: [promise],
                }),
            },
        });
        expect(getCalculatedStrength(ok, frodo)).toBe(4);
        expect(getCalculatedStrength(ok, sam)).toBe(4);
        expect(getCalculatedStrength(ok, merry)).toBe(3);

        const samExhausted = { ...sam, wounds: 3 };
        const broken = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, samExhausted, merry],
                    supportArea: [promise],
                }),
            },
        });
        expect(getCalculatedStrength(broken, frodo)).toBe(3);
        expect(getCalculatedStrength(broken, samExhausted)).toBe(3);
        expect(getCalculatedStrength(broken, merry)).toBe(3);
    });
});
