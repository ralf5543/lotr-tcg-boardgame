import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import {
    canLiberateASite,
    getLiberatableSites,
    liberateSite,
} from '../logic/sites';
import {
    createCard,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

const liberateAbility: Ability = {
    id: '15R141:0',
    phases: ['REGROUP'],
    cost: [{ discardFromPlay: [{ count: 1, target: 'SELF' }] }],
    effects: [{ type: 'LIBERATE_SITE' }],
    source: 'SELF',
};

function pathWithSites(counts: number) {
    return Array.from({ length: 9 }, (_, i) =>
        i < counts
            ? createSite({
                  id: `site-${i + 1}`,
                  instanceId: `site-${i + 1}`,
                  siteNumber: i + 1,
                  ownerId: '0',
              })
            : null
    );
}

describe('liberateSite helpers', () => {
    it('aucun site si personne ne contrôle', () => {
        const G = createGameState({
            path: pathWithSites(3),
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });
        expect(canLiberateASite(G, '0')).toBe(false);
        expect(getLiberatableSites(G, '0')).toEqual([]);
    });

    it('libère le site adverse de plus haut numéro', () => {
        const G = createGameState({
            path: pathWithSites(4),
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });
        G.path[0]!.controlledBy = '1';
        G.path[2]!.controlledBy = '1';
        G.path[1]!.controlledBy = '0';
        expect(getLiberatableSites(G, '0').map((x) => x.pathIndex)).toEqual([
            2, 0,
        ]);
        const liberated = liberateSite(G, '0');
        expect(liberated?.id).toBe('site-3');
        expect(G.path[2]?.controlledBy).toBeUndefined();
        expect(G.path[0]?.controlledBy).toBe('1');
    });

    it('défausse les conditions attachées au liberate', () => {
        const cond = createCard({
            id: '4R30',
            instanceId: 'nr',
            kind: 'SHADOW',
            type: 'CONDITION',
        });
        const site = createSite({
            id: 'site-1',
            instanceId: 'site-1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
            attachments: [cond],
        });
        const G = createGameState({
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', { discard: [] }),
                '1': createPlayerState('1', { discard: [] }),
            },
        });
        expect(liberateSite(G, '0')?.id).toBe('site-1');
        expect(G.path[0]?.attachments || []).toHaveLength(0);
        expect(G.players['1'].discard.some((c) => c.instanceId === 'nr')).toBe(
            true
        );
    });
});

describe('LIBERATE_SITE ability', () => {
    it('applique via applyAbilityEffect', () => {
        const source = createCard({
            id: '15R141',
            instanceId: 'shield',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            abilities: [liberateAbility],
        });
        const G = createGameState({
            path: pathWithSites(2),
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });
        G.path[0]!.controlledBy = '1';
        expect(abilityHasLegalEffectTarget(G, source, liberateAbility)).toBe(
            true
        );
        expect(applyAbilityEffect(G, source, liberateAbility)).toBe(true);
        expect(G.path[0]?.controlledBy).toBeUndefined();
    });

    it('refuse si aucun site adverse contrôlé', () => {
        const source = createCard({
            id: '15R141',
            instanceId: 'shield',
            kind: 'FREE_PEOPLE',
            abilities: [liberateAbility],
        });
        const G = createGameState({
            path: pathWithSites(2),
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1'),
            },
        });
        expect(abilityHasLegalEffectTarget(G, source, liberateAbility)).toBe(
            false
        );
        expect(applyAbilityEffect(G, source, liberateAbility)).toBe(false);
    });
});
