import { describe, expect, it } from 'vitest';
import {
    acceptPendingWhenPlayed,
    resolveWhenPlayed,
} from '../engine/abilities/whenPlayed';
import { tokenCountOnCard } from '../logic/cultureTokens';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';
import { getCardById } from '../cardsData';

describe('13C83 / 13C164 spot site path → reinforce', () => {
    it('13C83 reinforce 3 MEN si plains sur le path', () => {
        const card = getCardById('13C83');
        expect(
            card?.abilities?.some(
                (a) =>
                    a.trigger?.type === 'WHEN_PLAYED' &&
                    a.trigger.spotSiteKeyword?.keyword === 'PLAINS' &&
                    a.effects.some(
                        (e) =>
                            e.type === 'REINFORCE_CULTURE_TOKEN' &&
                            e.culture === 'MEN' &&
                            e.count === 3
                    )
            )
        ).toBe(true);

        const played = {
            ...card!,
            instanceId: 'caravan-play',
            abilities: card!.abilities,
        };
        const seed = {
            ...getCardById('13C83')!,
            instanceId: 'men-seed',
            cultureTokens: { MEN: 1 } as const,
        };
        const G = createGameState({
            path: [
                createSite({
                    id: 'plains',
                    keywords: ['PLAINS'],
                    siteNumber: 1,
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
                '1': createPlayerState('1', {
                    profile: {
                        name: 'Shadow',
                        avatar: '',
                        faction: 'shadow',
                    },
                    supportArea: [seed, played],
                }),
            },
        });

        resolveWhenPlayed(G, played, { playerId: '1', phase: 'shadow' });
        // 1 cible : toaster + désignation (pas d’auto-appliquer).
        expect(G.pendingWhenPlayed?.abilityId).toBeTruthy();
        expect(tokenCountOnCard(seed, 'MEN')).toBe(1);
        expect(
            acceptPendingWhenPlayed(G, '1', undefined, seed.instanceId)
        ).toBe(true);
        expect(tokenCountOnCard(seed, 'MEN')).toBe(4);
    });

    it('13C83 n’applique pas sans plains', () => {
        const card = getCardById('13C83')!;
        const played = {
            ...card,
            instanceId: 'caravan-play',
        };
        const seed = {
            ...card,
            instanceId: 'men-seed',
            cultureTokens: { MEN: 1 },
        };
        const G = createGameState({
            path: [
                createSite({
                    id: 'forest',
                    keywords: ['FOREST'],
                    siteNumber: 1,
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
                '1': createPlayerState('1', {
                    profile: {
                        name: 'Shadow',
                        avatar: '',
                        faction: 'shadow',
                    },
                    supportArea: [seed, played],
                }),
            },
        });

        resolveWhenPlayed(G, played, { playerId: '1', phase: 'shadow' });
        expect(G.pendingWhenPlayed).toBeUndefined();
        expect(tokenCountOnCard(seed, 'MEN')).toBe(1);
    });
});
