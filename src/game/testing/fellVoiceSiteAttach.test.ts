import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { attachesToSite } from '../engine/canPlayCard';
import {
    findLegalAttachmentHosts,
    findLegalSiteAttachmentHosts,
    getDeckOrDiscardPlayCandidates,
    playCardFromDeckOrDiscard,
} from '../logic/playFromOutOfPlay';
import {
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Fell Voice — climat sur site depuis la défausse', () => {
    it('Neiges = Plays on a site', () => {
        const snows = getCardById('1C138');
        expect(snows && attachesToSite(snows)).toBe(true);
    });

    it('findLegalAttachmentHosts inclut les sites du chemin pour un climat', () => {
        const snows = {
            ...getCardById('1C138')!,
            instanceId: 'snows',
        };
        const siteA = createSite({
            id: 'site-a',
            instanceId: 'site-a',
            siteNumber: 1,
            ownerId: '0',
        });
        const siteB = createSite({
            id: 'site-b',
            instanceId: 'site-b',
            siteNumber: 2,
            ownerId: '1',
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', { discard: [snows] }),
            },
            path: [siteA, siteB, null, null, null, null, null, null, null],
            battlefield: [
                createMinion({
                    id: 'saruman',
                    instanceId: 'saruman',
                    title: 'Saruman',
                }),
            ],
        });

        const sites = findLegalSiteAttachmentHosts(G, '1', snows);
        expect(sites.map((s) => s.instanceId || s.id)).toEqual(
            expect.arrayContaining(['site-a', 'site-b'])
        );
        const hosts = findLegalAttachmentHosts(G, '1', snows, 'shadow');
        expect(hosts.length).toBeGreaterThanOrEqual(2);
        expect(
            getDeckOrDiscardPlayCandidates(
                G,
                '1',
                [['ISENGARD', 'WEATHER', 'CONDITION']],
                'shadow',
                null,
                'DISCARD'
            ).some((c) => c.instanceId === 'snows')
        ).toBe(true);
    });

    it('playCardFromDeckOrDiscard attache le climat sur le site choisi', () => {
        const snows = {
            ...getCardById('1C138')!,
            instanceId: 'snows',
        };
        const site = createSite({
            id: 'site-a',
            instanceId: 'site-a',
            siteNumber: 1,
            ownerId: '0',
        });
        const saruman = createMinion({
            id: '4R173',
            instanceId: 'saruman',
            title: 'Saruman',
            culture: 'ISENGARD',
            race: 'WIZARD',
            vitality: 4,
        });
        const G = createGameState({
            twilightPool: 2,
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', { discard: [snows] }),
            },
            path: [site, null, null, null, null, null, null, null, null],
            battlefield: [saruman],
        });

        const played = playCardFromDeckOrDiscard(
            G,
            '1',
            'snows',
            [['ISENGARD', 'WEATHER', 'CONDITION']],
            'shadow',
            site as never,
            'DISCARD',
            2
        );
        expect(played).toBeTruthy();
        expect(site.attachments?.some((a) => a?.instanceId === 'snows')).toBe(
            true
        );
        expect(G.players['1']?.supportArea?.length || 0).toBe(0);
        expect(G.players['1']?.discard?.length || 0).toBe(0);
    });
});
