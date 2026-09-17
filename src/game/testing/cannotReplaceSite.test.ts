import { describe, expect, it } from 'vitest';
import {
    canReplaceCurrentSite,
    isSiteReplaceForbidden,
} from '../logic/siteReplaceRestrictions';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import type { Ability } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const cannotCurrent: Ability = {
    id: '15U113:0',
    phases: [],
    trigger: {
        type: 'WHILE',
        spot: [{ count: 1, target: [['ORC']] }],
    },
    cost: [],
    effects: [
        {
            type: 'CANNOT_REPLACE_SITE',
            player: 'FREE_PEOPLE',
            scope: 'CURRENT',
        },
    ],
    source: 'SELF',
};

const fpReplaceCurrent: Ability = {
    id: '12C40:0',
    phases: ['REGROUP'],
    cost: [],
    effects: [
        {
            type: 'REPLACE_SITE',
            scope: 'CURRENT',
            from: 'SITES_DECK',
        },
    ],
    source: 'SELF',
};

describe('cannot replace site', () => {
    it('bloque le FP sur le site courant si Orkish Camp + Orc spoté', () => {
        const current = createSite({
            id: 'current',
            siteNumber: 1,
            ownerId: '0',
        });
        const deckSite = createSite({ id: 'deck-site', ownerId: '0' });
        const camp = createCard({
            id: '15U113',
            type: 'CONDITION',
            kind: 'SHADOW',
            abilities: [cannotCurrent],
        });
        const G = createGameState({
            fpPlayerId: '0',
            path: [
                current,
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
                    currentSiteIndex: 0,
                    fellowshipArea: [createCompanion({ id: 'frodo' })],
                    sitesDeck: [deckSite],
                    supportArea: [],
                }),
                '1': createPlayerState('1', {
                    supportArea: [camp],
                }),
            },
            battlefield: [createMinion({ id: 'orc', race: 'ORC', culture: 'ORC' })],
        });

        expect(isSiteReplaceForbidden(G, '0', 0)).toBe(true);
        expect(canReplaceCurrentSite(G, '0')).toBe(false);
        // Ombre non bloquée
        expect(isSiteReplaceForbidden(G, '1', 0)).toBe(false);
    });

    it('n’applique pas le replace CURRENT FP si bloqué', () => {
        const current = createSite({
            id: 'current',
            siteNumber: 1,
            ownerId: '0',
        });
        const deckSite = createSite({ id: 'deck-site', ownerId: '0' });
        const camp = createCard({
            id: '15U113',
            type: 'CONDITION',
            kind: 'SHADOW',
            abilities: [cannotCurrent],
        });
        const event = createCard({
            id: '12C40',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            abilities: [fpReplaceCurrent],
        });
        const G = createGameState({
            fpPlayerId: '0',
            path: [
                current,
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
                    currentSiteIndex: 0,
                    sitesDeck: [deckSite],
                    supportArea: [event],
                }),
                '1': createPlayerState('1', {
                    supportArea: [camp],
                }),
            },
            battlefield: [createMinion({ id: 'orc', race: 'ORC', culture: 'ORC' })],
        });

        expect(
            applyAbilityEffect(G, event, fpReplaceCurrent, 'deck-site')
        ).toBe(false);
        expect(G.path[0]?.id).toBe('current');
    });

    it('ne bloque pas si aucun Orc spoté', () => {
        const current = createSite({
            id: 'current',
            siteNumber: 1,
            ownerId: '0',
        });
        const deckSite = createSite({ id: 'deck-site', ownerId: '0' });
        const camp = createCard({
            id: '15U113',
            type: 'CONDITION',
            kind: 'SHADOW',
            abilities: [cannotCurrent],
        });
        const G = createGameState({
            fpPlayerId: '0',
            path: [
                current,
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
                    currentSiteIndex: 0,
                    sitesDeck: [deckSite],
                }),
                '1': createPlayerState('1', {
                    supportArea: [camp],
                }),
            },
            battlefield: [],
        });

        expect(isSiteReplaceForbidden(G, '0', 0)).toBe(false);
        expect(canReplaceCurrentSite(G, '0')).toBe(true);
    });
});
