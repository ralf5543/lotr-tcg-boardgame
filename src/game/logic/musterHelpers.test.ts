import { describe, expect, it } from 'vitest';
import { getMusterCount } from './musterHelpers';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from '../testing/createGameState';

describe('getMusterCount', () => {
    it('compte les compagnons MUSTER de la Communauté active', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            keywords: ['MUSTER'],
                        }),
                        createCompanion({ id: 'sam' }),
                    ],
                }),
            },
        });

        expect(getMusterCount(G, '0')).toBe(1);
        expect(getMusterCount(G, '1')).toBe(0);
    });

    it('compte les séides MUSTER sur le champ de bataille pour l’Ombre', () => {
        const G = createGameState({
            battlefield: [
                createMinion({ id: 'orc', keywords: ['MUSTER'] }),
                createMinion({ id: 'troll' }),
            ],
        });

        expect(getMusterCount(G, '1')).toBe(1);
        expect(getMusterCount(G, '0')).toBe(0);
    });

    it('compte un MUSTER conféré par un attachement (grantsKeywords)', () => {
        const pipe = createCard({
            id: 'pipe',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            grantsKeywords: ['MUSTER'],
        });

        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            attachments: [pipe],
                        }),
                    ],
                }),
            },
        });

        expect(getMusterCount(G, '0')).toBe(1);
    });
});
