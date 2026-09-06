import { describe, expect, it } from 'vitest';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from '../testing/createGameState';
import { calculateArcheryTotals } from './archery';

describe('calculateArcheryTotals', () => {
    it('compte 1 par personnage ARCHER (FP et Ombre)', () => {
        const G = createGameState({
            battlefield: [
                createMinion({ id: 'archer-orc', keywords: ['ARCHER'] }),
                createMinion({ id: 'brute' }),
            ],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'legolas',
                            keywords: ['ARCHER'],
                        }),
                        createCompanion({ id: 'gimli' }),
                    ],
                }),
            },
        });

        expect(calculateArcheryTotals(G)).toEqual({
            fpTotal: 1,
            shadowTotal: 1,
        });
    });

    it('compte un archer via grantsKeywords d’un attachement', () => {
        const bow = createCard({
            id: 'bow',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            grantsKeywords: ['ARCHER'],
        });

        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'aragorn',
                            attachments: [bow],
                        }),
                    ],
                }),
            },
        });

        expect(calculateArcheryTotals(G)).toEqual({
            fpTotal: 1,
            shadowTotal: 0,
        });
    });

    it('ignore un archer marqué omitFromArcheryTotal', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'legolas',
                            keywords: ['ARCHER'],
                            omitFromArcheryTotal: true,
                        }),
                    ],
                }),
            },
        });

        expect(calculateArcheryTotals(G)).toEqual({
            fpTotal: 0,
            shadowTotal: 0,
        });
    });
});
