import { describe, expect, it } from 'vitest';
import { advanceCompany } from '../moves/fellowshipMoves';
import type { Ability } from '../types';
import {
    createGameState,
    createCard,
    createCompanion,
    createPlayerState,
    createSite,
} from './createGameState';

const moveFromRemove2: Ability = {
    id: '11S263:0:site-move',
    phases: [],
    cost: [],
    effects: [{ type: 'REMOVE_TWILIGHT', count: 2 }],
    source: 'SELF',
    trigger: { type: 'MOVES_FROM' },
};

describe('site move abilities', () => {
    it('retire le crépuscule au départ après le coût du move (11S263)', () => {
        const fromSite = createSite({
            id: '11S263',
            name: 'West Gate of Moria',
            twilightCost: 2,
            keywords: ['UNDERGROUND'],
            abilities: [moveFromRemove2],
            siteNumber: 1,
        });
        const toSite = createSite({
            id: '11S231',
            name: 'Caras Galadhon',
            twilightCost: 1,
            siteNumber: 2,
        });

        const G = createGameState({
            twilightPool: 0,
            path: [
                fromSite,
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({ id: 'c1' }),
                        createCompanion({ id: 'c2' }),
                    ],
                }),
            },
        });

        advanceCompany(G);

        // CR : from (−2 sur pool 0 = 0) puis + (site 1 + 2 compagnons) = 3
        expect(G.players['0']?.currentSiteIndex).toBe(1);
        expect(G.twilightPool).toBe(3);
        expect(G.statusMessage).toMatch(/→ 3/);
    });

    it('n’applique rien si le site n’a pas d’ability', () => {
        const G = createGameState({
            twilightPool: 0,
            path: [
                createSite({ id: 'a', twilightCost: 0 }),
                createSite({ id: 'b', twilightCost: 2 }),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [createCompanion({ id: 'c1' })],
                }),
            },
        });

        advanceCompany(G);
        expect(G.twilightPool).toBe(3); // 2 + 1 compagnon
    });

    it('défausse chaque allié à l’arrivée (11S228)', () => {
        const toSite = createSite({
            id: '11S228',
            name: 'Anduin Banks',
            twilightCost: 0,
            abilities: [
                {
                    id: '11S228:0:site-move',
                    phases: [],
                    cost: [],
                    effects: [{ type: 'DISCARD_ALL', target: [['ALLY']] }],
                    source: 'SELF',
                    trigger: { type: 'MOVES_TO' },
                },
            ],
        });
        const ally = createCard({
            id: 'ally-1',
            type: 'ALLY',
            kind: 'FREE_PEOPLE',
        });
        const companion = createCompanion({ id: 'c1' });

        const G = createGameState({
            path: [
                createSite({ id: 'from' }),
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [companion],
                    supportArea: [ally],
                    discard: [],
                }),
            },
        });

        advanceCompany(G);

        expect(G.players['0']?.supportArea).toHaveLength(0);
        expect(G.players['0']?.discard?.some((c) => c.id === 'ally-1')).toBe(
            true
        );
        expect(G.players['0']?.fellowshipArea).toHaveLength(1);
    });

    it('West Gate → Fangorn : from avant crépuscule du move (pool 0 → 7)', () => {
        const fromSite = createSite({
            id: '11S263',
            twilightCost: 2,
            abilities: [
                {
                    id: 'wg',
                    phases: [],
                    cost: [],
                    trigger: { type: 'MOVES_FROM' },
                    source: 'SELF',
                    effects: [{ type: 'REMOVE_TWILIGHT', count: 2 }],
                },
            ],
        });
        const toSite = createSite({
            id: '11S239',
            twilightCost: 0,
            abilities: [
                {
                    id: 'fg',
                    phases: [],
                    cost: [],
                    trigger: { type: 'MOVES_TO' },
                    source: 'SELF',
                    effects: [
                        {
                            type: 'ADD_TWILIGHT',
                            count: 1,
                            perInPlay: [['FREE_PEOPLE', 'WEAPON']],
                        },
                    ],
                },
            ],
        });
        const axe = createCard({
            id: 'axe',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            subtype: 'HAND-WEAPON',
        });
        const G = createGameState({
            twilightPool: 0,
            path: [
                fromSite,
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: Array.from({ length: 6 }, (_, i) => ({
                        ...createCompanion({ id: `c${i}` }),
                        attachments: i === 0 ? [axe] : [],
                    })),
                }),
            },
        });
        advanceCompany(G);
        // from −2 (noop sur 0) ; to +1 arme ; move +6 compagnons → 7
        expect(G.twilightPool).toBe(7);
    });

    it('Orthanc : +2 crépuscule par compagnon au-delà de 5', () => {
        const toSite = createSite({
            id: '11S241',
            twilightCost: 0,
            abilities: [
                {
                    id: 'orthanc',
                    phases: [],
                    cost: [],
                    trigger: { type: 'MOVES_TO' },
                    source: 'SELF',
                    effects: [
                        {
                            type: 'ADD_TWILIGHT',
                            count: 2,
                            perCompanionOver: 5,
                        },
                    ],
                },
            ],
        });
        const G = createGameState({
            twilightPool: 0,
            path: [
                createSite({ id: 'from' }),
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: Array.from({ length: 6 }, (_, i) =>
                        createCompanion({ id: `c${i}` })
                    ),
                }),
            },
        });
        advanceCompany(G);
        // CR : to (+2 × 1 compagnon over 5) puis move 0+6+0 → 8
        expect(G.twilightPool).toBe(8);
    });

    it('Fangorn : +1 crépuscule par arme Peuples Libres', () => {
        const toSite = createSite({
            id: '11S239',
            twilightCost: 0,
            abilities: [
                {
                    id: 'fangorn',
                    phases: [],
                    cost: [],
                    trigger: { type: 'MOVES_TO' },
                    source: 'SELF',
                    effects: [
                        {
                            type: 'ADD_TWILIGHT',
                            count: 1,
                            perInPlay: [['FREE_PEOPLE', 'WEAPON']],
                        },
                    ],
                },
            ],
        });
        const axe = createCard({
            id: 'axe',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            subtype: 'HAND-WEAPON',
        });
        const G = createGameState({
            twilightPool: 0,
            path: [
                createSite({ id: 'from' }),
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        {
                            ...createCompanion({ id: 'c1' }),
                            attachments: [axe],
                        },
                    ],
                }),
            },
        });
        advanceCompany(G);
        // CR : to (+1 arme) puis move 0+1+0 → 2
        expect(G.twilightPool).toBe(2);
    });

    it('Neekerbreekers : soigne rés.≥5, affaiblit les autres', () => {
        const toSite = createSite({
            id: '11S249',
            twilightCost: 0,
            abilities: [
                {
                    id: 'bog',
                    phases: [],
                    cost: [],
                    trigger: { type: 'MOVES_TO' },
                    source: 'SELF',
                    effects: [
                        {
                            type: 'HEAL',
                            count: 1,
                            all: true,
                            minResistance: 5,
                            target: [['CHARACTER']],
                        },
                        {
                            type: 'EXERT',
                            count: 1,
                            all: true,
                            maxResistance: 4,
                            target: [['CHARACTER']],
                        },
                    ],
                },
            ],
        });
        const tough = createCompanion({
            id: 'tough',
            resistance: 6,
            vitality: 4,
            wounds: 1,
        });
        const weak = createCompanion({
            id: 'weak',
            resistance: 3,
            vitality: 4,
            wounds: 0,
        });
        const G = createGameState({
            path: [
                createSite({ id: 'from' }),
                toSite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    burdens: 0,
                    fellowshipArea: [tough, weak],
                }),
            },
        });
        advanceCompany(G);
        expect(tough.wounds).toBe(0);
        expect(weak.wounds).toBe(1);
    });

    it('Crags : blessure de masse seulement en regroup région 2', () => {
        const fromSite = createSite({
            id: '11S234',
            siteNumber: 5,
            abilities: [
                {
                    id: 'crags',
                    phases: [],
                    cost: [],
                    trigger: {
                        type: 'MOVES_FROM',
                        duringRegroup: true,
                        siteRegion: 2,
                    },
                    source: 'SELF',
                    effects: [
                        {
                            type: 'WOUND',
                            count: 1,
                            all: true,
                            target: [['COMPANION']],
                        },
                    ],
                },
            ],
        });
        const companion = createCompanion({ id: 'c1', vitality: 4, wounds: 0 });
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
                    fellowshipArea: [companion],
                }),
            },
        });
        advanceCompany(G);
        expect(companion.wounds).toBe(1);

        // Même départ hors regroup : pas de blessure.
        const companion2 = createCompanion({ id: 'c2', vitality: 4, wounds: 0 });
        const G2 = createGameState({
            regroupStep: undefined,
            path: [
                null,
                null,
                null,
                null,
                fromSite,
                createSite({ id: 'to2', twilightCost: 0, siteNumber: 6 }),
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 4,
                    fellowshipArea: [companion2],
                }),
            },
        });
        advanceCompany(G2);
        expect(companion2.wounds).toBe(0);
    });
});
