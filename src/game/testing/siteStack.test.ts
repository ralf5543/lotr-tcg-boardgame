import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import {
    playStackedMinion,
    stackMinionOnControlledSite,
} from '../logic/sites';
import {
    createGameState,
    createMinion,
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
