import type { CardState } from '../types';
import { describe, expect, it } from 'vitest';
import { calculateArcheryTotals } from '../logic/archery';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

function possession(
    overrides: Partial<CardState> & {
        id: string;
        attachedTo?: string[][];
    }
): CardState {
    const { attachedTo, ...rest } = overrides;
    return {
        ...createCard({
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            twilightCost: 1,
            ...rest,
        }),
        attachedTo: (attachedTo ?? [['COMPANION']]) as unknown as string[],
    };
}

describe('attachCard', () => {
    it('attache une possession FP et ajoute du Crépuscule', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                        hand: [
                            possession({
                                id: 'sword',
                                subtype: 'HAND-WEAPON',
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.attachCard(0, 'comp-1');

        expect(engine.getG().players['0']?.hand).toHaveLength(0);
        expect(
            engine.getG().players['0']?.fellowshipArea[0]?.attachments
        ).toHaveLength(1);
        expect(engine.getG().twilightPool).toBe(1);
    });

    it('refuse une cible hors attachedTo, et un second HAND-WEAPON', () => {
        const existingSword = possession({
            id: 'sword-1',
            subtype: 'HAND-WEAPON',
        });
        const secondSword = possession({
            id: 'sword-2',
            subtype: 'HAND-WEAPON',
        });
        const hobbitOnly = possession({
            id: 'pony',
            attachedTo: [['HOBBIT', 'COMPANION']],
        });

        const man = createCompanion({
            id: 'comp-1',
            race: 'MAN',
            attachments: [existingSword],
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [man],
                        hand: [hobbitOnly, secondSword],
                    }),
                },
            },
        });

        engine.moves.attachCard(0, 'comp-1');
        expect(engine.getG().players['0']?.hand).toHaveLength(2);

        engine.moves.attachCard(1, 'comp-1');
        expect(engine.getG().players['0']?.hand).toHaveLength(2);
        expect(
            engine.getG().players['0']?.fellowshipArea[0]?.attachments
        ).toHaveLength(1);
    });

    it('fait payer le Crépuscule quand l’Ombre attache (le plateau passe par attachCard)', () => {
        const blade = possession({
            id: 'blade',
            kind: 'SHADOW',
            twilightCost: 2,
            attachedTo: [['MINION']],
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 5,
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '1': createPlayerState('1', { hand: [blade] }),
                },
            },
        });

        engine.moves.attachCard(0, 'orc');

        expect(engine.getG().twilightPool).toBe(3);
        expect(engine.getG().battlefield[0]?.attachments?.[0]?.id).toBe('blade');
        expect(engine.getG().players['1']?.hand).toHaveLength(0);
    });

    it('confère ARCHER via grantsKeywords une fois attaché', () => {
        const bow = possession({
            id: 'bow',
            grantsKeywords: ['ARCHER'],
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                        hand: [bow],
                    }),
                },
            },
        });

        engine.moves.attachCard(0, 'comp-1');

        expect(calculateArcheryTotals(engine.getG())).toEqual({
            fpTotal: 1,
            shadowTotal: 0,
        });
    });
});
