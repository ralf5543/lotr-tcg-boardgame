import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from './statCalculator';
import { getEnduringStrengthBonus } from './mechanics/enduringModifier';
import { getHunterStrengthBonus } from './mechanics/hunterModifier';
import {
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
});
