import { describe, expect, it } from 'vitest';
import {
    canSpotSiteWithKeyword,
    getCurrentSite,
    isAtSiteWithKeyword,
    isCurrentSiteSanctuary,
    siteHasKeyword,
} from '../logic/sites';
import type { SiteCardState } from '../types';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

function emptyPath(): (SiteCardState | null)[] {
    return Array.from({ length: 9 }, () => null);
}

describe('logic/sites — mots-clés', () => {
    it('siteHasKeyword lit la liste du site', () => {
        const site = createSite({
            keywords: ['UNDERGROUND', 'BATTLEGROUND'],
        });
        expect(siteHasKeyword(site, 'UNDERGROUND')).toBe(true);
        expect(siteHasKeyword(site, 'FOREST')).toBe(false);
        expect(siteHasKeyword(null, 'UNDERGROUND')).toBe(false);
    });

    it('getCurrentSite / isAtSiteWithKeyword suivent le chemin', () => {
        const sanctuary = createSite({
            id: 'sanctuary',
            name: 'Rivendell',
            keywords: ['SANCTUARY'],
        });
        const underground = createSite({
            id: 'mines',
            name: 'Moria',
            keywords: ['UNDERGROUND'],
        });
        const path = emptyPath();
        path[0] = underground;
        path[2] = sanctuary;

        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 2 }),
            },
        });

        expect(getCurrentSite(G)?.id).toBe('sanctuary');
        expect(isCurrentSiteSanctuary(G)).toBe(true);
        expect(isAtSiteWithKeyword(G, 'UNDERGROUND')).toBe(false);

        G.players['0']!.currentSiteIndex = 0;
        expect(isAtSiteWithKeyword(G, 'UNDERGROUND')).toBe(true);
        expect(isCurrentSiteSanctuary(G)).toBe(false);
    });

    it('canSpotSiteWithKeyword voit tout le path', () => {
        const path = emptyPath();
        path[1] = createSite({ keywords: ['PLAINS'] });
        path[4] = createSite({ keywords: ['UNDERGROUND'] });

        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 1 }),
            },
        });

        expect(canSpotSiteWithKeyword(G, 'UNDERGROUND')).toBe(true);
        expect(canSpotSiteWithKeyword(G, 'MOUNTAIN')).toBe(false);
        expect(isAtSiteWithKeyword(G, 'PLAINS')).toBe(true);
    });
});
