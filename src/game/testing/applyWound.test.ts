import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import { createCompanion, createPlayerState } from './createGameState';

describe('applyWound / cleanupPendingDeaths', () => {
    it('tue un compagnon à 0 vitalité et l’envoie à la pile des morts', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                vitality: 1,
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('comp-1');

        expect(engine.getG().players['0']?.fellowshipArea[0]?.isDead).toBe(true);
        expect(engine.getG().pendingDeadCardIds).toContain('comp-1');

        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().players['0']?.fellowshipArea).toHaveLength(0);
        expect(engine.getG().players['0']?.deadPile[0]?.id).toBe('comp-1');
    });
});
