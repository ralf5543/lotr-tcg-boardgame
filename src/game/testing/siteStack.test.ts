import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import {
    payAbilityCost,
    resolveDiscardFromHandCount,
} from '../engine/abilities/payAbilityCost';
import {
    playStackedMinion,
    stackMinionOnControlledSite,
} from '../logic/sites';
import {
    createGameState,
    createMinion,
    createCard,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

const stackAbility: Ability = {
    id: '4C180:0',
    phases: ['REGROUP'],
    cost: [],
    effects: [{ type: 'STACK_ON_CONTROLLED_SITE' }],
    source: 'SELF',
};

const playFromStackAbility: Ability = {
    id: '4C180:1',
    phases: ['SHADOW'],
    cost: [],
    effects: [{ type: 'PLAY_FROM_STACK', twilightReduce: 1 }],
    source: 'SELF',
    requiresStackedOnControlledSite: true,
};

describe('stack on controlled site', () => {
    it('empile le séide sur le site contrôlé de plus bas numéro', () => {
        const besieger = createMinion({
            id: '4C180',
            instanceId: 'besieger',
            twilightCost: 2,
            minionSiteNumber: 5,
        });
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 3,
            twilightPool: 5,
            path: [
                createSite({
                    id: 's1',
                    instanceId: 's1',
                    siteNumber: 1,
                    ownerId: '0',
                    controlledBy: '1',
                }),
                createSite({
                    id: 's2',
                    instanceId: 's2',
                    siteNumber: 2,
                    ownerId: '0',
                    controlledBy: '1',
                }),
                createSite({
                    id: 's3',
                    instanceId: 's3',
                    siteNumber: 3,
                    ownerId: '0',
                }),
                createSite({
                    id: 's4',
                    instanceId: 's4',
                    siteNumber: 4,
                    ownerId: '0',
                }),
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
            battlefield: [besieger],
        });

        expect(abilityHasLegalEffectTarget(G, besieger, stackAbility)).toBe(
            true
        );
        expect(
            applyAbilityEffect(G, besieger, stackAbility)
        ).toBe(true);
        expect(G.battlefield).toHaveLength(0);
        expect(G.path[0]?.stacked?.map((c) => c.instanceId)).toEqual([
            'besieger',
        ]);
        expect(G.path[1]?.stacked || []).toHaveLength(0);
    });

    it('empile sur le site choisi quand plusieurs sites sont contrôlés', () => {
        const besieger = createMinion({
            id: '4C180',
            instanceId: 'besieger',
            twilightCost: 2,
            minionSiteNumber: 5,
        });
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 3,
            twilightPool: 5,
            path: [
                createSite({
                    id: 's1',
                    instanceId: 's1',
                    siteNumber: 1,
                    ownerId: '0',
                    controlledBy: '1',
                }),
                createSite({
                    id: 's2',
                    instanceId: 's2',
                    siteNumber: 2,
                    ownerId: '0',
                    controlledBy: '1',
                }),
                createSite({
                    id: 's3',
                    instanceId: 's3',
                    siteNumber: 3,
                    ownerId: '0',
                }),
                createSite({
                    id: 's4',
                    instanceId: 's4',
                    siteNumber: 4,
                    ownerId: '0',
                }),
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
            battlefield: [besieger],
        });

        expect(
            applyAbilityEffect(G, besieger, stackAbility, 's2')
        ).toBe(true);
        expect(G.path[0]?.stacked || []).toHaveLength(0);
        expect(G.path[1]?.stacked?.map((c) => c.instanceId)).toEqual([
            'besieger',
        ]);
    });

    it('empile un autre assiégeant désigné (Troll)', () => {
        const troll = createMinion({
            id: '8R108',
            instanceId: 'troll',
            twilightCost: 8,
            vitality: 4,
            keywords: ['BESIEGER', 'FIERCE'],
            culture: 'SAURON',
            race: 'TROLL',
        });
        const troop = createMinion({
            id: '7R279',
            instanceId: 'troop',
            twilightCost: 4,
            keywords: ['BESIEGER'],
            culture: 'SAURON',
            race: 'ORC',
        });
        const stackOther: Ability = {
            id: '8R108:0',
            phases: ['REGROUP'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'STACK_ON_CONTROLLED_SITE',
                    target: [['BESIEGER']],
                },
            ],
            source: 'SELF',
        };
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 3,
            path: [
                createSite({
                    id: 's1',
                    instanceId: 's1',
                    siteNumber: 1,
                    ownerId: '0',
                    controlledBy: '1',
                }),
                createSite({
                    id: 's2',
                    instanceId: 's2',
                    siteNumber: 2,
                    ownerId: '0',
                    controlledBy: '1',
                }),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
            battlefield: [troll, troop],
        });

        expect(abilityHasLegalEffectTarget(G, troll, stackOther)).toBe(true);
        expect(
            applyAbilityEffect(G, troll, stackOther, ['troop', 's2'])
        ).toBe(true);
        expect(G.battlefield?.map((c) => c.instanceId)).toEqual(['troll']);
        expect(G.path[1]?.stacked?.map((c) => c.instanceId)).toEqual(['troop']);
    });

    it('Engine Shadow : joue un séide Sauron empilé (désigné)', () => {
        const engine = createCard({
            id: '8U107',
            instanceId: 'engine',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'SAURON',
            title: 'Their Marching Companies',
        });
        const troop = createMinion({
            id: '7R279',
            instanceId: 'troop',
            twilightCost: 4,
            keywords: ['BESIEGER'],
            culture: 'SAURON',
            race: 'ORC',
        });
        const playOther: Ability = {
            id: '8U107:1',
            phases: ['SHADOW'],
            cost: [{ removeThreats: 1 }],
            effects: [
                {
                    type: 'PLAY_FROM_STACK',
                    target: [['SAURON', 'MINION']],
                },
            ],
            source: 'SELF',
        };
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        site.stacked = [troop];
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 3,
            twilightPool: 10,
            path: [
                site,
                null,
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
                    currentSiteIndex: 3,
                    threats: 2,
                }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
            battlefield: [],
        });

        expect(abilityHasLegalEffectTarget(G, engine, playOther)).toBe(true);
        expect(
            applyAbilityEffect(G, engine, playOther, 'troop')
        ).toBe(true);
        expect(G.path[0]?.stacked || []).toHaveLength(0);
        expect(G.battlefield?.map((c) => c.instanceId)).toEqual(['troop']);
        expect(G.twilightPool).toBe(6);
    });

    it('Officer Skirmish : défausse 2 + play stacked Orc avec Fierce et force +6', () => {
        const officer = createMinion({
            id: '7R274',
            instanceId: 'officer',
            culture: 'SAURON',
            race: 'ORC',
            keywords: ['BESIEGER'],
        });
        const stacked = createMinion({
            id: '7C273',
            instanceId: 'garrison',
            culture: 'SAURON',
            race: 'ORC',
            keywords: ['BESIEGER'],
            twilightCost: 3,
            minionSiteNumber: 1,
        });
        const playStacked: Ability = {
            id: '7R274:0',
            phases: ['SKIRMISH'],
            cost: [{ discardFromHand: 2 }],
            effects: [
                {
                    type: 'PLAY_FROM_STACK',
                    target: [['SAURON', 'ORC']],
                    grantsTempKeywords: [
                        { keyword: 'FIERCE', expiresAtPhase: 'REGROUP' },
                    ],
                    grantsTempStats: [
                        {
                            stat: 'STRENGTH',
                            value: 6,
                            expiresAtPhase: 'REGROUP',
                        },
                    ],
                },
            ],
            source: 'SELF',
        };
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        site.stacked = [stacked];
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 3,
            twilightPool: 10,
            path: [
                site,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 3,
                    hand: [
                        createMinion({ id: 'h1', instanceId: 'h1' }),
                        createMinion({ id: 'h2', instanceId: 'h2' }),
                    ],
                }),
            },
            battlefield: [officer],
        });

        expect(abilityHasLegalEffectTarget(G, officer, playStacked)).toBe(
            true
        );
        expect(
            applyAbilityEffect(G, officer, playStacked, 'garrison')
        ).toBe(true);
        expect(G.path[0]?.stacked || []).toHaveLength(0);
        expect(G.battlefield?.map((c) => c.instanceId).sort()).toEqual([
            'garrison',
            'officer',
        ]);
        const played = G.battlefield?.find((c) => c.instanceId === 'garrison');
        expect(played?.tempKeywords).toEqual([
            { keyword: 'FIERCE', expiresAtPhase: 'REGROUP' },
        ]);
        expect(
            G.tempModifiers?.some(
                (m) =>
                    m.targetCardId === 'garrison' &&
                    m.stat === 'STRENGTH' &&
                    m.value === 6
            )
        ).toBe(true);
    });

    it('Garrison : défausse 1 si la cible est assiégeant, sinon 2', () => {
        const garrison = createMinion({
            id: '7C273',
            instanceId: 'garrison',
            culture: 'SAURON',
            race: 'ORC',
            keywords: ['BESIEGER'],
        });
        const besieger = createMinion({
            id: '7R279',
            instanceId: 'troop',
            culture: 'SAURON',
            race: 'ORC',
            keywords: ['BESIEGER'],
        });
        const plainOrc = createMinion({
            id: 'orc',
            instanceId: 'plain',
            culture: 'SAURON',
            race: 'ORC',
        });
        const stackAbility: Ability = {
            id: '7C273:0',
            phases: ['REGROUP'],
            cost: [
                {
                    discardFromHand: 2,
                    discardFromHandIfEffectHasKeyword: {
                        keyword: 'BESIEGER',
                        count: 1,
                    },
                },
            ],
            effects: [
                {
                    type: 'STACK_ON_CONTROLLED_SITE',
                    target: [['SAURON', 'ORC']],
                },
            ],
            source: 'SELF',
        };
        expect(resolveDiscardFromHandCount(stackAbility, besieger)).toBe(1);
        expect(resolveDiscardFromHandCount(stackAbility, plainOrc)).toBe(2);

        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 3,
            twilightPool: 5,
            path: [
                site,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 3,
                    hand: [
                        createMinion({ id: 'h1', instanceId: 'h1' }),
                        createMinion({ id: 'h2', instanceId: 'h2' }),
                    ],
                }),
            },
            battlefield: [garrison, besieger, plainOrc],
        });

        expect(
            payAbilityCost(
                G,
                garrison,
                stackAbility.cost,
                'troop',
                ['h1'],
                'troop'
            )
        ).toBe(true);
        expect(G.players['1']?.hand).toHaveLength(1);
        expect(applyAbilityEffect(G, garrison, stackAbility, 'troop')).toBe(
            true
        );
        expect(G.path[0]?.stacked?.map((c) => c.instanceId)).toEqual([
            'troop',
        ]);
    });

    it('refuse play from stack hors pile / sans contrôle', () => {
        const besieger = createMinion({
            id: '4C180',
            instanceId: 'besieger',
            twilightCost: 2,
            minionSiteNumber: 5,
        });
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 3,
            twilightPool: 5,
            path: [
                createSite({
                    id: 's1',
                    instanceId: 's1',
                    siteNumber: 1,
                    ownerId: '0',
                }),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
            battlefield: [besieger],
        });

        expect(
            abilityMeetsPlayRestrictions(G, besieger, playFromStackAbility)
        ).toBe(false);
        expect(
            abilityHasLegalEffectTarget(G, besieger, playFromStackAbility)
        ).toBe(false);
    });

    it('joue depuis la pile avec réduction de crépuscule', () => {
        const besieger = createMinion({
            id: '4C180',
            instanceId: 'besieger',
            twilightCost: 2,
            minionSiteNumber: 5,
        });
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        site.stacked = [besieger];
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 3,
            twilightPool: 5,
            path: [
                site,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
            battlefield: [],
        });

        expect(
            abilityMeetsPlayRestrictions(G, besieger, playFromStackAbility)
        ).toBe(true);
        expect(
            applyAbilityEffect(G, besieger, playFromStackAbility)
        ).toBe(true);
        // Coût 2 + roaming (+2 car site home 5 > site 4) − 1 = 3
        expect(G.twilightPool).toBe(2);
        expect(G.battlefield.map((c) => c.instanceId)).toEqual(['besieger']);
        expect(G.path[0]?.stacked || []).toHaveLength(0);
    });

    it('stackMinionOnControlledSite + playStackedMinion helpers', () => {
        const besieger = createMinion({
            id: '4C180',
            instanceId: 'besieger',
            twilightCost: 2,
            minionSiteNumber: 1,
        });
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 2,
            twilightPool: 10,
            path: [
                createSite({
                    id: 's1',
                    instanceId: 's1',
                    siteNumber: 1,
                    ownerId: '0',
                    controlledBy: '1',
                }),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 2 }),
                '1': createPlayerState('1', { currentSiteIndex: 2 }),
            },
            battlefield: [besieger],
        });

        expect(stackMinionOnControlledSite(G, besieger, '1')?.id).toBe('s1');
        expect(G.battlefield).toHaveLength(0);
        const paid = playStackedMinion(G, besieger, '1', 1);
        expect(paid).toBe(1); // coût 2 − 1, pas roaming (home 1 ≤ site 3)
        expect(G.twilightPool).toBe(9);
        expect(G.battlefield).toHaveLength(1);
    });
});
