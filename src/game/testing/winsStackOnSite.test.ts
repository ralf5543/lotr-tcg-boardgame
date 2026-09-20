import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import { tryOpenWinsSkirmish } from '../engine/responseWindow';
import { canUseAbility } from '../engine/canUseAbility';
import {
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

const stackOnWin: Ability = {
    id: '4U24:0',
    phases: ['RESPONSE'],
    trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
    optional: true,
    cost: [],
    effects: [{ type: 'STACK_ON_CONTROLLED_SITE' }],
    source: 'SELF',
};

describe('wins skirmish → stack on controlled site', () => {
    it('empile le vainqueur sur le site contrôlé', () => {
        const rabble = createMinion({
            id: '4U24',
            instanceId: 'rabble',
            culture: 'DUNLAND',
            race: 'MAN',
            abilities: [stackOnWin],
            actionPhases: ['RESPONSE'],
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
            battlefield: [rabble],
            pendingWinsSkirmish: {
                winnerIds: ['rabble'],
                skirmishId: 'sk1',
            },
        });

        expect(tryOpenWinsSkirmish(G)).toBe('WAITING');
        expect(G.responseWindow?.activePlayerId).toBe('1');
        expect(
            canUseAbility(rabble, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '1',
            }).valid
        ).toBe(true);
        expect(abilityHasLegalEffectTarget(G, rabble, stackOnWin)).toBe(true);
        expect(applyAbilityEffect(G, rabble, stackOnWin)).toBe(true);
        expect(G.battlefield).toHaveLength(0);
        expect(G.path[0]?.stacked?.map((c) => c.instanceId)).toEqual([
            'rabble',
        ]);
    });

    it('refuse sans site contrôlé', () => {
        const rabble = createMinion({
            id: '4U24',
            instanceId: 'rabble',
            abilities: [stackOnWin],
        });
        const G = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 2,
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
                '0': createPlayerState('0', { currentSiteIndex: 2 }),
                '1': createPlayerState('1', { currentSiteIndex: 2 }),
            },
            battlefield: [rabble],
        });
        expect(abilityHasLegalEffectTarget(G, rabble, stackOnWin)).toBe(false);
    });
});

describe('wins skirmish → play from stack (Olog)', () => {
    const playBesiegerOnWin: Ability = {
        id: '8R105:0',
        phases: ['RESPONSE'],
        trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
        optional: true,
        cost: [],
        effects: [
            {
                type: 'PLAY_FROM_STACK',
                target: [['BESIEGER']],
                grantsTempKeywords: [
                    { keyword: 'FIERCE', expiresAtPhase: 'REGROUP' },
                    { keyword: 'DAMAGE +1', expiresAtPhase: 'REGROUP' },
                ],
            },
        ],
        source: 'SELF',
    };

    it('joue un assiégeant empilé avec Fierce et Damage +1 jusqu’au ralliement', () => {
        const olog = createMinion({
            id: '8R105',
            instanceId: 'olog',
            culture: 'SAURON',
            race: 'TROLL',
            keywords: ['BESIEGER', 'FIERCE'],
            abilities: [playBesiegerOnWin],
            actionPhases: ['RESPONSE'],
            twilightCost: 10,
        });
        const stacked = createMinion({
            id: '4C180',
            instanceId: 'besieger',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
            keywords: ['BESIEGER'],
            twilightCost: 2,
            minionSiteNumber: 1,
        });
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
            twilightPool: 5,
            path: [
                site,
                createSite({
                    id: 's2',
                    instanceId: 's2',
                    siteNumber: 2,
                    ownerId: '0',
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
            battlefield: [olog],
            pendingWinsSkirmish: {
                winnerIds: ['olog'],
                skirmishId: 'sk1',
            },
        });

        expect(tryOpenWinsSkirmish(G)).toBe('WAITING');
        expect(abilityHasLegalEffectTarget(G, olog, playBesiegerOnWin)).toBe(
            true
        );
        expect(
            applyAbilityEffect(G, olog, playBesiegerOnWin, 'besieger')
        ).toBe(true);
        expect(G.path[0]?.stacked || []).toHaveLength(0);
        expect(G.battlefield?.map((c) => c.instanceId).sort()).toEqual([
            'besieger',
            'olog',
        ]);
        const played = G.battlefield?.find((c) => c.instanceId === 'besieger');
        expect(played?.tempKeywords).toEqual([
            { keyword: 'FIERCE', expiresAtPhase: 'REGROUP' },
            { keyword: 'DAMAGE +1', expiresAtPhase: 'REGROUP' },
        ]);
        expect(G.twilightPool).toBe(3);
    });
});
