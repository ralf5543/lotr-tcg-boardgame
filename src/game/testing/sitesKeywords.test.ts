import { describe, expect, it } from 'vitest';
import {
    canSpotSiteWithKeyword,
    countSitesWithKeyword,
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
        const plains = createSite({
            id: 'plains',
            name: 'Ettenmoors',
            keywords: ['PLAINS'],
        });
        const underground = createSite({
            id: 'mines',
            name: 'Moria',
            keywords: ['UNDERGROUND'],
        });
        const path = emptyPath();
        path[0] = underground;
        path[2] = plains;

        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 2 }),
            },
        });

        expect(getCurrentSite(G)?.id).toBe('plains');
        // Standard : emplacement 3 = sanctuaire même sans mot-clé imprimé
        expect(isCurrentSiteSanctuary(G)).toBe(true);
        expect(isAtSiteWithKeyword(G, 'PLAINS')).toBe(true);
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
        expect(countSitesWithKeyword(G, 'UNDERGROUND')).toBe(1);
        expect(countSitesWithKeyword(G, 'PLAINS')).toBe(1);
    });
});
