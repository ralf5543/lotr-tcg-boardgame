import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { advanceCompany } from '../moves/fellowshipMoves';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

describe('parseSiteAbilities — moves rest (13–18)', () => {
    it('Abandoned Mine Shaft : not region 1 + regroup → fardeau', () => {
        expect(
            parseSiteAbilities(
                '**Underground.** If this site is not in region 1 when the fellowship moves from here during the regroup phase, add a burden.',
                '13U185'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: {
                    type: 'MOVES_FROM',
                    duringRegroup: true,
                    unlessSiteRegion: 1,
                },
                effects: [{ type: 'ADD_BURDENS', count: 1 }],
            }),
        ]);
    });

    it('Gate of Mordor : twilight × cultures', () => {
        expect(
            parseSiteAbilities(
                '**Battleground.** Each time the fellowship moves to this site, add <symbol>twilight1</symbol> for each culture you can spot.',
                '15S191'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_TO' },
                effects: [
                    {
                        type: 'ADD_TWILIGHT',
                        count: 1,
                        perDistinctCulture: true,
                    },
                ],
            }),
        ]);
    });

    it('City Gates : menaces × compagnons over 4 (×2 si hunter minion)', () => {
        expect(
            parseSiteAbilities(
                'When the Fellowship moves to this site, add a threat (or 2 if you can spot a hunter minion) for each companion over 4.',
                '15S189'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_TO' },
                effects: [
                    {
                        type: 'ADD_THREATS',
                        count: 1,
                        perCompanionOver: 4,
                        countIfSpot: {
                            target: [['HUNTER', 'MINION']],
                            count: 2,
                        },
                    },
                ],
            }),
        ]);
    });

    it('Mithlond : heal chaque personnage', () => {
        expect(
            parseSiteAbilities(
                '**River.** When the fellowship moves to this site, each player heals each of his or her characters.',
                '18U136'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_TO' },
                effects: [
                    {
                        type: 'HEAL',
                        count: 1,
                        all: true,
                        target: [['CHARACTER']],
                    },
                ],
            }),
        ]);
    });

    it('Imladris : sanctuaire → retire 2 fardeaux', () => {
        expect(
            parseSiteAbilities(
                '**River.** When the fellowship moves to this site, if it is a sanctuary, remove 2 burdens.',
                '17U147'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_TO', requiresSanctuary: true },
                effects: [{ type: 'REMOVE_BURDENS', count: 2 }],
            }),
        ]);
    });
});

describe('runtime — moves rest', () => {
    it('Mine Shaft : fardeau au départ regroup hors région 1', () => {
        const fromSite = createSite({
            id: '13U185',
            siteNumber: 5,
            keywords: ['UNDERGROUND'],
            abilities: [
                {
                    id: 'mine',
                    phases: [],
                    cost: [],
                    trigger: {
                        type: 'MOVES_FROM',
                        duringRegroup: true,
                        unlessSiteRegion: 1,
                    },
                    source: 'SELF',
                    effects: [{ type: 'ADD_BURDENS', count: 1 }],
                } as Ability,
            ],
        });
        const G = createGameState({
            regroupStep: 'FP_DECISION',
            path: [
                null,
                null,
                null,
                null,
                fromSite,
                createSite({ id: 'to', twilightCost: 0, siteNumber: 6 }),
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 4,
                    burdens: 0,
                    fellowshipArea: [createCompanion({ id: 'c1' })],
                }),
            },
        });
        advanceCompany(G);
        expect(G.players['0']?.burdens).toBe(1);
    });

    it('Gate of Mordor : +1 crépuscule par culture', () => {
        const toSite = createSite({
            id: '15S191',
            siteNumber: 2,
            abilities: [
                {
                    id: 'gate',
                    phases: [],
                    cost: [],
                    trigger: { type: 'MOVES_TO' },
                    source: 'SELF',
                    effects: [
                        {
                            type: 'ADD_TWILIGHT',
                            count: 1,
                            perDistinctCulture: true,
                        },
                    ],
                } as Ability,
            ],
        });
        const G = createGameState({
            twilightPool: 0,
            path: [
                createSite({ id: 'from', twilightCost: 0, siteNumber: 1 }),
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            battlefield: [
                createMinion({
                    id: 'orc',
                    culture: 'SAURON',
                }),
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({ id: 'c1', culture: 'SHIRE' }),
                        createCompanion({ id: 'c2', culture: 'GONDOR' }),
                    ],
                }),
            },
        });
        advanceCompany(G);
        // Site cost 0 + 2 companions + region0 + 3 cultures = 5
        expect(G.twilightPool).toBe(0 + 2 + 3);
    });

    it('City Gates : 2 menaces / compagnon over 4 si hunter minion', () => {
        const toSite = createSite({
            id: '15S189',
            siteNumber: 2,
            abilities: [
                {
                    id: 'gates',
                    phases: [],
                    cost: [],
                    trigger: { type: 'MOVES_TO' },
                    source: 'SELF',
                    effects: [
                        {
                            type: 'ADD_THREATS',
                            count: 1,
                            perCompanionOver: 4,
                            countIfSpot: {
                                target: [['HUNTER', 'MINION']],
                                count: 2,
                            },
                        },
                    ],
                } as Ability,
            ],
        });
        const companions = Array.from({ length: 5 }, (_, i) =>
            createCompanion({ id: `c${i}`, instanceId: `c${i}` })
        );
        const G = createGameState({
            path: [
                createSite({ id: 'from', twilightCost: 0, siteNumber: 1 }),
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            battlefield: [
                createMinion({
                    id: 'hunter',
                    keywords: ['HUNTER 1'],
                }),
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    threats: 0,
                    fellowshipArea: companions,
                }),
            },
        });
        advanceCompany(G);
        // 1 companion over 4 × 2 = 2 ; limite menaces = 5 compagnons
        expect(G.players['0']?.threats).toBe(2);
    });

    it('Mithlond : soigne PL et Ombre', () => {
        const companion = createCompanion({
            id: 'c1',
            wounds: 2,
            vitality: 4,
        });
        const minion = createMinion({ id: 'm1', wounds: 2, vitality: 4 });
        const toSite = createSite({
            id: '18U136',
            siteNumber: 2,
            abilities: [
                {
                    id: 'mith',
                    phases: [],
                    cost: [],
                    trigger: { type: 'MOVES_TO' },
                    source: 'SELF',
                    effects: [
                        {
                            type: 'HEAL',
                            count: 1,
                            all: true,
                            target: [['CHARACTER']],
                        },
                    ],
                } as Ability,
            ],
        });
        const G = createGameState({
            path: [
                createSite({ id: 'from', twilightCost: 0, siteNumber: 1 }),
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [companion],
                }),
            },
        });
        advanceCompany(G);
        expect(companion.wounds).toBe(1);
        expect(minion.wounds).toBe(1);
    });

    it('Imladris : retire 2 fardeaux seulement en sanctuaire (site 6)', () => {
        const ability: Ability = {
            id: 'imladris',
            phases: [],
            cost: [],
            trigger: { type: 'MOVES_TO', requiresSanctuary: true },
            source: 'SELF',
            effects: [{ type: 'REMOVE_BURDENS', count: 2 }],
        };
        const makePath = (imladrisIndex: number) => {
            const path = Array.from({ length: 9 }, (_, i) =>
                createSite({ id: `p-${i}`, siteNumber: i + 1, twilightCost: 0 })
            );
            path[imladrisIndex] = createSite({
                id: '17U147',
                siteNumber: imladrisIndex + 1,
                twilightCost: 0,
                abilities: [ability],
            });
            return path;
        };

        // Site 6 (index 5) = sanctuaire
        const G = createGameState({
            path: makePath(5),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 4,
                    burdens: 3,
                    fellowshipArea: [createCompanion({ id: 'c1' })],
                }),
            },
        });
        advanceCompany(G);
        expect(G.players['0']?.burdens).toBe(1);

        // Site 5 (index 4) = pas sanctuaire
        const G2 = createGameState({
            path: makePath(4),
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 3,
                    burdens: 3,
                    fellowshipArea: [createCompanion({ id: 'c1b' })],
                }),
            },
        });
        advanceCompany(G2);
        expect(G2.players['0']?.burdens).toBe(3);
    });
});
