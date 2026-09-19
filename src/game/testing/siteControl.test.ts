import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import {
    canTakeControlOfASite,
    countSitesControlledBy,
    getControllablePathSites,
    replacePathSiteFromDeck,
    takeControlOfSite,
} from '../logic/sites';
import {
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

const takeControlAbility: Ability = {
    id: '8C106:0',
    phases: ['REGROUP'],
    cost: [{ exert: [{ count: 2, target: 'SELF' }] }],
    effects: [{ type: 'TAKE_CONTROL_SITE' }],
    source: 'SELF',
};

function pathWithSites(counts: number, ownerId = '0') {
    return Array.from({ length: 9 }, (_, i) =>
        i < counts
            ? createSite({
                  id: `site-${i + 1}`,
                  instanceId: `site-${i + 1}`,
                  siteNumber: i + 1,
                  ownerId,
              })
            : null
    );
}

describe('takeControlOfSite helpers', () => {
    it('ne propose aucun site si la compagnie est au site 1', () => {
        const G = createGameState({
            path: pathWithSites(3),
            currentSiteIndex: 0,
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', { currentSiteIndex: 0 }),
            },
        });
        expect(canTakeControlOfASite(G)).toBe(false);
        expect(getControllablePathSites(G)).toEqual([]);
    });

    it('prend le site non contrôlé de plus bas numéro déjà passé', () => {
        const G = createGameState({
            path: pathWithSites(4),
            currentSiteIndex: 3,
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
        });
        G.path[0]!.controlledBy = '0';
        expect(getControllablePathSites(G).map((x) => x.pathIndex)).toEqual([
            1, 2,
        ]);
        const taken = takeControlOfSite(G, '1');
        expect(taken?.id).toBe('site-2');
        expect(G.path[1]?.controlledBy).toBe('1');
        expect(countSitesControlledBy(G, '1')).toBe(1);
    });

    it('efface le contrôle au replace', () => {
        const old = createSite({
            id: 'old',
            instanceId: 'old',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        const neu = createSite({
            id: 'new',
            instanceId: 'new',
            ownerId: '0',
        });
        const G = createGameState({
            path: [old, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', { sitesDeck: [neu] }),
            },
        });
        expect(replacePathSiteFromDeck(G, '0', 0, 'new')).toBe(true);
        expect(G.path[0]?.controlledBy).toBeUndefined();
        expect(G.players['0'].sitesDeck.some((s) => s.id === 'old')).toBe(
            true
        );
        const returned = G.players['0'].sitesDeck.find((s) => s.id === 'old');
        expect(returned?.controlledBy).toBeUndefined();
    });
});

describe('TAKE_CONTROL_SITE ability', () => {
    it('applique le contrôle via applyAbilityEffect', () => {
        const source = createMinion({
            id: '8C106',
            instanceId: 'siege',
            vitality: 4,
            abilities: [takeControlAbility],
        });
        const G = createGameState({
            path: pathWithSites(4),
            currentSiteIndex: 3,
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', { currentSiteIndex: 3 }),
            },
            battlefield: [source],
        });
        expect(abilityHasLegalEffectTarget(G, source, takeControlAbility)).toBe(
            true
        );
        expect(applyAbilityEffect(G, source, takeControlAbility)).toBe(true);
        expect(G.path[0]?.controlledBy).toBe('1');
    });

    it('refuse si aucun site contrôlable', () => {
        const source = createMinion({
            id: '8C106',
            instanceId: 'siege',
            abilities: [takeControlAbility],
        });
        const G = createGameState({
            path: pathWithSites(1),
            currentSiteIndex: 0,
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', { currentSiteIndex: 0 }),
            },
            battlefield: [source],
        });
        expect(abilityHasLegalEffectTarget(G, source, takeControlAbility)).toBe(
            false
        );
        expect(applyAbilityEffect(G, source, takeControlAbility)).toBe(false);
    });
});
