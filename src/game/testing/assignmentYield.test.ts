import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('cession d’affectation à l’Ombre', () => {
    it('laisse l’Ombre assigner les séides restants, même si des compagnons sont libres', () => {
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({ id: 'minion-1' }),
                    createMinion({ id: 'minion-2' }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'comp-1' }),
                            createCompanion({ id: 'comp-2' }),
                        ],
                    }),
                },
            },
        });

        engine.moves.assignMinion('minion-1', 'comp-1');
        expect(engine.getG().assignmentStep).toBe('FP_ASSIGN');

        engine.moves.yieldAssignmentToShadow();

        expect(engine.getG().assignmentStep).toBe('SHADOW_ASSIGN');
        expect(engine.getCtx().phase).toBe('assignment');

        engine.moves.assignMinion('minion-2', 'comp-2');
        expect(engine.getG().skirmishes).toHaveLength(1);

        engine.updatePlayerID('1');
        engine.moves.assignMinion('minion-2', 'comp-2');

        expect(engine.getG().skirmishes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    companionId: 'comp-1',
                    minionIds: ['minion-1'],
                }),
                expect.objectContaining({
                    companionId: 'comp-2',
                    minionIds: ['minion-2'],
                }),
            ])
        );
        expect(engine.getCtx().phase).toBe('skirmish');
    });

    it('refuse la cession hors FP_ASSIGN, et à l’Ombre', () => {
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '1',
            G: {
                battlefield: [createMinion({ id: 'minion-1' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        engine.moves.yieldAssignmentToShadow();
        expect(engine.getG().assignmentStep).toBe('FP_ASSIGN');

        engine.updatePlayerID('0');
        engine.moves.yieldAssignmentToShadow();
        expect(engine.getG().assignmentStep).toBe('SHADOW_ASSIGN');

        engine.moves.yieldAssignmentToShadow();
        expect(engine.getG().assignmentStep).toBe('SHADOW_ASSIGN');
    });
});
