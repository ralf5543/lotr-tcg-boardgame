import { describe, expect, it } from 'vitest';
import {
    buildGameEndDetail,
    checkCorruptionLoss,
    checkRingBearerKilledLoss,
    checkSiteNineWin,
    dismissGameEndOverlay,
    findLivingRingBearer,
    gameEndTitleForViewer,
} from '../logic/gameEnd';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

describe('Fin de partie', () => {
    it('phrases : accord + Vous pour le gagnant', () => {
        expect(
            buildGameEndDetail({
                reason: 'CORRUPTION',
                ringBearerName: 'Galadriel',
                ringBearerIsFemale: true,
            })
        ).toBe('Galadriel a été corrompue par la volonté de l’Anneau.');
        expect(
            buildGameEndDetail({
                reason: 'SITE_NINE',
                ringBearerName: 'Frodon',
                ringBearerIsFemale: false,
            })
        ).toBe(
            'Frodon, aidé de ses compagnons, a détruit l’Anneau de Sauron.'
        );
        expect(
            buildGameEndDetail({
                reason: 'RING_BEARER_KILLED',
                ringBearerName: 'Éowyn',
                ringBearerIsFemale: true,
            })
        ).toBe('Éowyn a succombé à ses blessures.');
        expect(
            gameEndTitleForViewer(
                { winnerPlayerId: '1', winnerName: 'Tom' },
                '1'
            )
        ).toBe('Vous remportez la partie');
        expect(
            gameEndTitleForViewer(
                { winnerPlayerId: '1', winnerName: 'Tom' },
                '0'
            )
        ).toBe('Tom remporte la partie');
    });

    it('corruption : fardeaux ≥ résistance du Porteur', () => {
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            title: 'Frodon',
            keywords: ['RING-BEARER'],
            resistance: 5,
            vitality: 4,
        });
        const G = createGameState({
            fpPlayerId: '0',
            setupState: {
                bids: { '0': null, '1': null },
                mulligans: { '0': null, '1': null },
                step: 'COMPLETE',
            },
            players: {
                '0': createPlayerState('0', {
                    burdens: 5,
                    fellowshipArea: [frodo],
                    profile: {
                        name: 'Raphaël',
                        avatar: '',
                        faction: 'freePeoples',
                    },
                }),
                '1': createPlayerState('1', {
                    profile: {
                        name: 'Tom',
                        avatar: '',
                        faction: 'shadow',
                    },
                }),
            },
        });
        expect(checkCorruptionLoss(G)).toBe(true);
        expect(G.gameResult?.winnerSide).toBe('SHADOW');
        expect(G.gameResult?.winnerName).toBe('Tom');
        expect(G.gameResult?.winnerPlayerId).toBe('1');
        expect(G.gameResult?.detail).toBe(
            'Frodon a été corrompu par la volonté de l’Anneau.'
        );
        expect(checkCorruptionLoss(G)).toBe(false);
    });

    it('pas de corruption si résistance reste > 0', () => {
        const frodo = createCompanion({
            id: 'frodo',
            keywords: ['RING-BEARER'],
            resistance: 10,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 9,
                    fellowshipArea: [frodo],
                }),
            },
        });
        expect(checkCorruptionLoss(G)).toBe(false);
        expect(G.gameResult).toBeUndefined();
    });

    it('mort du Porteur sans relève', () => {
        const G = createGameState({
            setupState: {
                bids: { '0': null, '1': null },
                mulligans: { '0': null, '1': null },
                step: 'COMPLETE',
            },
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: 'merry', title: 'Merry' }),
                    ],
                    deadPile: [
                        createCompanion({
                            id: 'frodo',
                            title: 'Frodon',
                            keywords: ['RING-BEARER'],
                            isDead: true,
                        }),
                    ],
                    profile: {
                        name: 'Raphaël',
                        avatar: '',
                        faction: 'freePeoples',
                    },
                }),
                '1': createPlayerState('1', {
                    profile: {
                        name: 'Tom',
                        avatar: '',
                        faction: 'shadow',
                    },
                }),
            },
        });
        expect(findLivingRingBearer(G)).toBeNull();
        expect(checkRingBearerKilledLoss(G)).toBe(true);
        expect(G.gameResult?.reason).toBe('RING_BEARER_KILLED');
        expect(G.gameResult?.winnerName).toBe('Tom');
        expect(G.gameResult?.detail).toBe('Frodon a succombé à ses blessures.');
    });

    it('site 9 + Porteur vivant → joueur FP', () => {
        const galadriel = createCompanion({
            id: 'galadriel',
            title: 'Galadriel',
            keywords: ['RING-BEARER'],
            resistance: 10,
            isFemale: true,
        });
        const G = createGameState({
            currentSiteIndex: 8,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 8,
                    burdens: 0,
                    fellowshipArea: [galadriel],
                    profile: {
                        name: 'Raphaël',
                        avatar: '',
                        faction: 'freePeoples',
                    },
                }),
            },
        });
        expect(checkSiteNineWin(G)).toBe(true);
        expect(G.gameResult).toMatchObject({
            winnerSide: 'FREE_PEOPLES',
            reason: 'SITE_NINE',
            winnerName: 'Raphaël',
            winnerPlayerId: '0',
            detail:
                'Galadriel, aidée de ses compagnons, a détruit l’Anneau de Sauron.',
        });
        expect(gameEndTitleForViewer(G.gameResult!, '0')).toBe(
            'Vous remportez la partie'
        );
    });

    it('dismiss overlay sans effacer le résultat', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodon',
            keywords: ['RING-BEARER'],
            resistance: 1,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 1,
                    fellowshipArea: [frodo],
                }),
                '1': createPlayerState('1'),
            },
        });
        checkCorruptionLoss(G);
        dismissGameEndOverlay(G);
        expect(G.gameResult?.overlayDismissed).toBe(true);
        expect(G.gameResult?.winnerSide).toBe('SHADOW');
    });

});
