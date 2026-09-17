import { describe, expect, it } from 'vitest';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    getCurrentSite,
    getFellowshipCurrentRegion,
    getPathSitesInRegion,
    replaceCurrentSiteFromDeck,
    replacePathSiteFromDeck,
    canReplaceSiteInCurrentRegion,
} from '../logic/sites';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

const replaceAbility: Ability = {
    id: '13C120:1',
    phases: ['SHADOW'],
    cost: [
        {
            discardFromPlay: [{ count: 1, target: 'SELF' }],
            spot: [{ count: 1, target: [['ORC', 'MINION']] }],
        },
    ],
    effects: [
        {
            type: 'REPLACE_SITE',
            scope: 'CURRENT',
            from: 'SITES_DECK',
            siteKeyword: 'UNDERGROUND',
        },
    ],
    source: 'SELF',
};

const regionReplaceAbility: Ability = {
    id: '12C34:0',
    phases: ['MANEUVER', 'REGROUP'],
    cost: [{ spot: [{ count: 1, target: [['GANDALF', 'WIZARD']] }] }],
    effects: [
        {
            type: 'REPLACE_SITE',
            scope: 'REGION',
            from: 'SITES_DECK',
        },
    ],
    source: 'SELF',
};

describe('replacePathSiteFromDeck', () => {
    it('remplace un site hors courant dans la même région', () => {
        const site1 = createSite({
            id: 'plains-1',
            instanceId: 'plains-1',
            keywords: ['PLAINS'],
            siteNumber: 1,
            ownerId: '0',
        });
        const site2 = createSite({
            id: 'plains-2',
            instanceId: 'plains-2',
            keywords: ['PLAINS'],
            siteNumber: 2,
            ownerId: '0',
        });
        const newSite = createSite({
            id: 'river-new',
            instanceId: 'river-new',
            keywords: ['RIVER'],
            ownerId: '0',
        });
        const G = createGameState({
            path: [site1, site2, null, null, null, null, null, null, null],
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 1,
                    sitesDeck: [newSite],
                }),
            },
        });

        expect(getFellowshipCurrentRegion(G)).toBe(1);
        expect(
            replacePathSiteFromDeck(G, '0', 0, 'river-new')
        ).toBe(true);
        expect(G.path[0]?.id).toBe('river-new');
        expect(G.path[0]?.siteNumber).toBe(1);
        expect(G.path[1]?.id).toBe('plains-2');
        expect(G.players['0']?.sitesDeck.some((s) => s.id === 'plains-1')).toBe(
            true
        );
    });
});

describe('canReplaceSiteInCurrentRegion', () => {
    it('exige un site deck différent du site path ciblé', () => {
        const site1 = createSite({
            id: 'same-id',
            instanceId: 'on-path',
            siteNumber: 4,
            ownerId: '0',
        });
        const twin = createSite({
            id: 'same-id',
            instanceId: 'in-deck',
            ownerId: '0',
        });
        const G = createGameState({
            path: [
                null,
                null,
                null,
                site1,
                null,
                null,
                null,
                null,
                null,
            ],
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 3,
                    sitesDeck: [twin],
                }),
            },
        });

        expect(getPathSitesInRegion(G, 2)).toHaveLength(1);
        expect(canReplaceSiteInCurrentRegion(G, '0')).toBe(false);
    });
});

describe('replaceCurrentSiteFromDeck', () => {
    it('échange le site courant, garde le numéro, renvoie l’ancien au propriétaire', () => {
        const oldSite = createSite({
            id: '11U239',
            instanceId: 'old-plains',
            keywords: ['PLAINS'],
            siteNumber: 1,
            ownerId: '0',
        });
        const newSite = createSite({
            id: '11S263',
            instanceId: 'new-underground',
            keywords: ['UNDERGROUND'],
            ownerId: '1',
        });
        const G = createGameState({
            path: [oldSite, null, null, null, null, null, null, null, null],
            currentSiteIndex: 0,
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    sitesDeck: [],
                }),
                '1': createPlayerState('1', {
                    sitesDeck: [newSite],
                }),
            },
        });

        expect(
            replaceCurrentSiteFromDeck(G, '1', 'new-underground', 'UNDERGROUND')
        ).toBe(true);

        const current = getCurrentSite(G);
        expect(current?.id).toBe('11S263');
        expect(current?.siteNumber).toBe(1);
        expect(G.players['0']?.sitesDeck.map((s) => s.id)).toContain('11U239');
        expect(G.players['1']?.sitesDeck).toHaveLength(0);
        expect(
            G.players['0']?.sitesDeck.find((s) => s.id === '11U239')?.siteNumber
        ).toBeUndefined();
    });

    it('refuse le même id site (Current Rulings)', () => {
        const site = createSite({
            id: '11S263',
            instanceId: 'on-path',
            keywords: ['UNDERGROUND'],
            siteNumber: 2,
            ownerId: '1',
        });
        const twin = createSite({
            id: '11S263',
            instanceId: 'in-deck',
            keywords: ['UNDERGROUND'],
            ownerId: '1',
        });
        const G = createGameState({
            path: [null, site, null, null, null, null, null, null, null],
            currentSiteIndex: 1,
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 1 }),
                '1': createPlayerState('1', { sitesDeck: [twin] }),
            },
        });

        expect(
            replaceCurrentSiteFromDeck(G, '1', 'in-deck', 'UNDERGROUND')
        ).toBe(false);
    });
});

describe('REPLACE_SITE ability effect', () => {
    it('applique l’effet avec un site choisi', () => {
        const condition = createCard({
            id: '13C120',
            instanceId: 'depths',
            type: 'CONDITION',
            kind: 'SHADOW',
            culture: 'ORC',
            abilities: [replaceAbility],
        });
        const orc = createMinion({
            id: 'orc',
            race: 'ORC',
            culture: 'ORC',
        });
        const oldSite = createSite({
            id: 'plains',
            keywords: ['PLAINS'],
            siteNumber: 1,
            ownerId: '0',
        });
        const underground = createSite({
            id: 'cave',
            instanceId: 'cave',
            keywords: ['UNDERGROUND'],
            ownerId: '1',
        });
        const G = createGameState({
            path: [oldSite, null, null, null, null, null, null, null, null],
            fpPlayerId: '0',
            battlefield: [orc],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                    sitesDeck: [underground],
                }),
            },
        });

        expect(
            applyAbilityEffect(G, condition, replaceAbility, 'cave')
        ).toBe(true);
        expect(getCurrentSite(G)?.id).toBe('cave');
        expect(getCurrentSite(G)?.siteNumber).toBe(1);
    });

    it('applique un replace REGION avec site path + site deck', () => {
        const site1 = createSite({
            id: 'plains-1',
            instanceId: 'plains-1',
            keywords: ['PLAINS'],
            siteNumber: 1,
            ownerId: '0',
        });
        const site2 = createSite({
            id: 'plains-2',
            instanceId: 'plains-2',
            keywords: ['PLAINS'],
            siteNumber: 2,
            ownerId: '0',
        });
        const river = createSite({
            id: 'river-new',
            instanceId: 'river-new',
            keywords: ['RIVER'],
            ownerId: '0',
        });
        const gandalf = createCompanion({
            id: 'gandalf',
            culture: 'GANDALF',
            type: 'COMPANION',
            keywords: ['WIZARD'],
        });
        const G = createGameState({
            path: [site1, site2, null, null, null, null, null, null, null],
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 1,
                    fellowshipArea: [gandalf],
                    sitesDeck: [river],
                }),
            },
        });

        expect(
            applyAbilityEffect(G, gandalf, regionReplaceAbility, [
                'plains-1',
                'river-new',
            ])
        ).toBe(true);
        expect(G.path[0]?.id).toBe('river-new');
        expect(G.path[1]?.id).toBe('plains-2');
    });
});
