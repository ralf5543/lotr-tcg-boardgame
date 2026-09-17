import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    canExchangeOwnedPathSite,
    getOwnedPathSites,
} from '../logic/sites';
import type { Ability } from '../types';
import {
    createCard,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const exchangeAbility: Ability = {
    id: '11U45:0',
    phases: ['SHADOW'],
    cost: [{ spot: [{ count: 1, target: [['Gollum']] }] }],
    effects: [
        { type: 'ADD_TWILIGHT', count: 3 },
        { type: 'EXCHANGE_SITE', from: 'SITES_DECK' },
    ],
    source: 'SELF',
};

describe('EXCHANGE_SITE', () => {
    it('échange un site owned path avec le deck (+ crépuscule)', () => {
        const mySite = createSite({
            id: 'my-path',
            siteNumber: 2,
            ownerId: '1',
            keywords: ['PLAINS'],
        });
        const fpSite = createSite({
            id: 'fp-path',
            siteNumber: 1,
            ownerId: '0',
        });
        const deckSite = createSite({
            id: 'my-deck',
            ownerId: '1',
            keywords: ['FOREST'],
        });
        const event = createCard({
            id: '11U45',
            type: 'EVENT',
            kind: 'SHADOW',
            abilities: [exchangeAbility],
        });
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            path: [
                fpSite,
                mySite,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', {
                    sitesDeck: [deckSite],
                }),
            },
            battlefield: [
                createMinion({
                    id: 'gollum',
                    title: 'Gollum',
                    culture: 'GOLLUM',
                }),
            ],
        });

        expect(getOwnedPathSites(G, '1')).toHaveLength(1);
        expect(canExchangeOwnedPathSite(G, '1')).toBe(true);
        expect(canExchangeOwnedPathSite(G, '0')).toBe(false);

        expect(
            applyAbilityEffect(G, event, exchangeAbility, [
                'my-path',
                'my-deck',
            ])
        ).toBe(true);

        expect(G.twilightPool).toBe(3);
        expect(G.path[1]?.id).toBe('my-deck');
        expect(G.path[1]?.siteNumber).toBe(2);
        expect(G.players['1']?.sitesDeck.map((s) => s.id)).toContain('my-path');
        expect(G.path[0]?.id).toBe('fp-path');
    });

    it('refuse d’échanger un site adverse', () => {
        const fpSite = createSite({
            id: 'fp-path',
            siteNumber: 1,
            ownerId: '0',
        });
        const deckSite = createSite({ id: 'shadow-deck', ownerId: '1' });
        const event = createCard({
            id: '11U45',
            type: 'EVENT',
            kind: 'SHADOW',
            abilities: [exchangeAbility],
        });
        const G = createGameState({
            fpPlayerId: '0',
            path: [
                fpSite,
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
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', { sitesDeck: [deckSite] }),
            },
        });

        expect(
            applyAbilityEffect(G, event, exchangeAbility, [
                'fp-path',
                'shadow-deck',
            ])
        ).toBe(false);
        expect(G.path[0]?.id).toBe('fp-path');
    });
});
