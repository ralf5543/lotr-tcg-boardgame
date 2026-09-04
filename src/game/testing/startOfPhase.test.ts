import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import { createCompanion, createPlayerState } from './createGameState';

describe('début de phase (startOf*)', () => {
    it('saute startOfFellowship s’il n’y a aucune capacité', () => {
        const engine = createEngineClient({
            startPhase: 'startOfFellowship',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        expect(engine.getCtx().phase).toBe('fellowship');
        expect(engine.getG().startOfPhaseState).toBeUndefined();
    });

    it('reste ouvert si une carte a actionPhases, puis avance quand le joueur confirme', () => {
        const engine = createEngineClient({
            startPhase: 'startOfFellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                actionPhases: ['startOfFellowship'],
                            }),
                        ],
                    }),
                },
            },
        });

        expect(engine.getCtx().phase).toBe('startOfFellowship');
        expect(engine.getG().startOfPhaseState?.players['0']?.isDone).toBe(
            false
        );
        expect(engine.getG().startOfPhaseState?.players['1']?.isDone).toBe(
            true
        );

        engine.moves.confirmStartOfPhase();

        expect(engine.getCtx().phase).toBe('fellowship');
        expect(engine.getG().startOfPhaseState).toBeUndefined();
    });
});
