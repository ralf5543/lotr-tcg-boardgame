import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import type { Ability } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const ETTENMOORS_ABILITY: Ability = {
    id: '11S237:0:site-phase',
    phases: ['SKIRMISH'],
    cost: [
        {
            exert: [
                {
                    count: 1,
                    target: [['CHARACTER']],
                    mode: 'DESIGNATION',
                    excludeKeywords: ['ENDURING'],
                },
            ],
        },
    ],
    effects: [
        {
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 2,
            target: 'COST_TARGET',
            expiresAtPhase: 'SKIRMISH',
        },
    ],
    source: 'SELF',
    text: 'Skirmish: Exert your character (except an enduring character), to make it strength +2.',
};

const WATCH_TOWER_ABILITY: Ability = {
    id: '11S262:0:site-phase',
    phases: ['MANEUVER'],
    cost: [
        {
            exert: [
                {
                    count: 1,
                    target: [['ORC', 'MINION']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [
        {
            type: 'DISCARD_FROM_HAND',
            count: 1,
            atRandom: true,
            whose: 'FREE_PEOPLES',
        },
    ],
    source: 'SELF',
    text: "Maneuver: Exert your orc minion to discard a card at random from the Free Peoples player's hand.",
};

describe('parseSiteAbilities — vague phase', () => {
    it('Ettenmoors : Skirmish exert → force +2 (COST_TARGET, sauf enduring)', () => {
        const text =
            '**Plains.** **Skirmish:** Exert your character (except an enduring character), to make it strength +2.';
        expect(parseSiteAbilities(text, '11S237')).toEqual([
            expect.objectContaining({
                phases: ['SKIRMISH'],
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['CHARACTER']],
                                mode: 'DESIGNATION',
                                excludeKeywords: ['ENDURING'],
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: 'COST_TARGET',
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
            }),
        ]);
    });

    it('Watch-tower : Maneuver exert orc → défausse aléatoire FP', () => {
        const text =
            '**Mountain.****Maneuver:** Exert your <symbol>orc</symbol> minion to discard a card at random from the Free Peoples player\'s hand.';
        expect(parseSiteAbilities(text, '11S262')).toEqual([
            expect.objectContaining({
                phases: ['MANEUVER'],
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['ORC', 'MINION']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'DISCARD_FROM_HAND',
                        count: 1,
                        atRandom: true,
                        whose: 'FREE_PEOPLES',
                    },
                ],
            }),
        ]);
    });

    it('Emyn Muil : Maneuver remove 2 + exert minion non fierce → FIERCE (COST_TARGET)', () => {
        // Espace insécable entre « is » et « not » : présent dans le CSV source.
        const text =
            '**Mountain. Maneuver:** Remove <symbol>twilight2</symbol> and exert your minion that is\u00a0not fierce to make that minion **fierce** until the regroup phase.';
        expect(parseSiteAbilities(text, '12S187')).toEqual([
            expect.objectContaining({
                phases: ['MANEUVER'],
                cost: [
                    {
                        removeTwilight: 2,
                        exert: [
                            {
                                count: 1,
                                target: [['MINION']],
                                mode: 'DESIGNATION',
                                excludeKeywords: ['FIERCE'],
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'FIERCE',
                        target: 'COST_TARGET',
                        expiresAtPhase: 'REGROUP',
                    },
                ],
                source: 'SELF',
            }),
        ]);
    });

    it('Emyn Muil : refuse si mot-clé exclu ≠ mot-clé donné', () => {
        const text =
            '**Mountain. Maneuver:** Remove <symbol>twilight2</symbol> and exert your minion that is not fierce to make that minion **damage** until the regroup phase.';
        expect(parseSiteAbilities(text, '12S187')).toBeUndefined();
    });

    it('Dol Guldur reste inerte (choix condition par les Peuples Libres)', () => {
        const text =
            '**Regroup:** Exert your minion and remove a threat to make the Free Peoples player discard one of his or her conditions.';
        expect(parseSiteAbilities(text, '17U145')).toBeUndefined();
    });

    it('laisse Buckland / Woody-End inertes (play Nazgûl)', () => {
        expect(
            parseSiteAbilities(
                '**Dwelling.** **Shadow:** Play a Nazgûl to discard a condition from play.',
                '11S230'
            )
        ).toBeUndefined();
        expect(
            parseSiteAbilities(
                '**Forest.****Shadow:** Remove a burden to play a Nazgûl from your discard pile.',
                '11S266'
            )
        ).toBeUndefined();
    });
});

describe('runtime — Ettenmoors / Watch-tower', () => {
    it('Ettenmoors : affaiblit + force +2 ; refuse enduring', () => {
        const aragorn = createCompanion({
            id: '0P14',
            instanceId: 'aragorn-1',
            title: 'Aragorn',
            strength: 8,
            vitality: 4,
        });
        const gimli = createCompanion({
            id: '1R13',
            instanceId: 'gimli-1',
            title: 'Gimli',
            strength: 6,
            vitality: 3,
            keywords: ['ENDURING'],
        });
        const site = {
            ...createSite({
                id: '11S237',
                instanceId: 'etten-1',
                siteNumber: 3,
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [ETTENMOORS_ABILITY],
            actionPhases: ['SKIRMISH'] as const,
        };
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({ id: `path-${i}`, siteNumber: i + 1 })
        );
        path[2] = site;

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                currentSiteIndex: 2,
                path,
                activeSkirmishId: 'sk-1',
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'aragorn-1',
                        minionIds: [],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 2,
                        fellowshipArea: [aragorn, gimli],
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 2 }),
                },
            },
        });

        engine.moves.activateAbility(
            'etten-1',
            ETTENMOORS_ABILITY.id,
            'aragorn-1'
        );
        const G = engine.getG();
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(
            getCalculatedStrength(G, G.players['0']!.fellowshipArea[0]!)
        ).toBe(10);

        // Enduring refusé.
        engine.moves.activateAbility(
            'etten-1',
            ETTENMOORS_ABILITY.id,
            'gimli-1'
        );
        expect(engine.getG().players['0']?.fellowshipArea[1]?.wounds || 0).toBe(
            0
        );
    });

    it('Watch-tower : Ombre affaiblit orc → défausse 1 carte FP', () => {
        const orc = createMinion({
            id: '1C266',
            instanceId: 'orc-1',
            title: 'Orc',
            culture: 'ORC',
            vitality: 2,
            strength: 5,
        });
        const site = {
            ...createSite({
                id: '11S262',
                instanceId: 'watch-1',
                siteNumber: 2,
                ownerId: '1',
            }),
            kind: 'SITE' as const,
            type: 'SITE' as const,
            abilities: [WATCH_TOWER_ABILITY],
            actionPhases: ['MANEUVER'] as const,
        };
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({ id: `path-${i}`, siteNumber: i + 1 })
        );
        path[1] = site;

        const handA = createCompanion({
            id: 'hand-a',
            instanceId: 'hand-a',
            title: 'A',
        });
        const handB = createCompanion({
            id: 'hand-b',
            instanceId: 'hand-b',
            title: 'B',
        });

        const engine = createEngineClient({
            startPhase: 'maneuver',
            playerID: '0',
            G: {
                currentSiteIndex: 1,
                path,
                battlefield: [orc],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 1,
                        hand: [handA, handB],
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 1 }),
                },
            },
        });

        engine.moves.passActionWindow();
        engine.updatePlayerID('1');
        engine.moves.activateAbility(
            'watch-1',
            WATCH_TOWER_ABILITY.id,
            'orc-1'
        );

        const G = engine.getG();
        expect(G.battlefield[0]?.wounds).toBe(1);
        expect(G.players['0']?.hand).toHaveLength(1);
        expect(G.players['0']?.discard).toHaveLength(1);
    });
});
