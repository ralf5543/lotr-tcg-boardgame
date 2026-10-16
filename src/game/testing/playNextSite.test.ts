import { describe, expect, it } from 'vitest';
import {
    canPlayNextSiteFromDeck,
    playNextSiteFromDeck,
} from '../logic/sites';
import {
    createCard,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('playNextSiteFromDeck (hors déplacement)', () => {
    it('emplacement vide : pose le site, compagnie inchangée, pas de crépuscule', () => {
        const deckSite = createSite({
            id: 'next-new',
            instanceId: 'next-new',
            name: 'Nouveau',
            twilightCost: 3,
        });
        const G = createGameState({
            twilightPool: 5,
            path: [
                createSite({ id: 's1', siteNumber: 1 }),
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
                '1': createPlayerState('1', {
                    currentSiteIndex: 0,
                    sitesDeck: [deckSite],
                }),
            },
        });

        expect(canPlayNextSiteFromDeck(G, '1')).toBe(true);
        expect(playNextSiteFromDeck(G, '1', 'next-new')).toBe(true);
        expect(G.path[1]?.id).toBe('next-new');
        expect(G.path[1]?.siteNumber).toBe(2);
        expect(G.players['0']?.currentSiteIndex).toBe(0);
        expect(G.twilightPool).toBe(5);
        expect(G.players['1']?.sitesDeck).toHaveLength(0);
    });

    it('prochain déjà là : remplace, transfère stack, ancien → deck propriétaire', () => {
        const stacked = createCard({
            id: 'orc-stack',
            instanceId: 'orc-stack',
            kind: 'SHADOW',
            type: 'MINION',
        });
        const oldNext = createSite({
            id: 'old-next',
            instanceId: 'old-next',
            name: 'Ancien',
            siteNumber: 2,
            ownerId: '0',
            stacked: [stacked],
        });
        const deckSite = createSite({
            id: 'replacement',
            instanceId: 'replacement',
            name: 'Remplaçant',
            twilightCost: 1,
        });
        const G = createGameState({
            twilightPool: 2,
            path: [
                createSite({ id: 's1', siteNumber: 1, ownerId: '0' }),
                oldNext,
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
                    sitesDeck: [],
                }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 0,
                    sitesDeck: [deckSite],
                }),
            },
        });

        expect(canPlayNextSiteFromDeck(G, '1')).toBe(true);
        expect(playNextSiteFromDeck(G, '1', 'replacement')).toBe(true);
        expect(G.path[1]?.id).toBe('replacement');
        expect(G.path[1]?.siteNumber).toBe(2);
        expect(G.path[1]?.stacked?.map((c) => c.id)).toEqual(['orc-stack']);
        expect(G.players['0']?.sitesDeck.some((s) => s.id === 'old-next')).toBe(
            true
        );
        expect(G.players['0']?.currentSiteIndex).toBe(0);
        expect(G.twilightPool).toBe(2);
    });

    it('site 9 : pas de prochain', () => {
        const G = createGameState({
            path: Array.from({ length: 9 }, (_, i) =>
                createSite({ id: `s${i + 1}`, siteNumber: i + 1 })
            ),
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 8 }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 8,
                    sitesDeck: [createSite({ id: 'extra' })],
                }),
            },
        });
        expect(canPlayNextSiteFromDeck(G, '1')).toBe(false);
    });
});
