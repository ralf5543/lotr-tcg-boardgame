import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('capacité d’affectation', () => {
    it('passe l’excédent à l’Ombre quand le compagnon est saturé', () => {
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
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        engine.moves.assignMinion('minion-1', 'comp-1');

        expect(engine.getG().assignmentStep).toBe('SHADOW_ASSIGN');
        expect(engine.getCtx().phase).toBe('assignment');

        engine.moves.assignMinion('minion-2', 'comp-1');
        expect(engine.getG().skirmishes[0]?.minionIds).toEqual(['minion-1']);

        engine.updatePlayerID('1');
        engine.moves.assignMinion('minion-2', 'comp-1');

        expect(engine.getG().skirmishes[0]?.minionIds).toEqual([
            'minion-1',
            'minion-2',
        ]);
        expect(engine.getCtx().phase).toBe('skirmish');
    });

    it('autorise deux séides sur un compagnon DEFENDER +1', () => {
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
                            createCompanion({
                                id: 'comp-1',
                                keywords: ['DEFENDER +1'],
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.assignMinion('minion-1', 'comp-1');
        expect(engine.getG().assignmentStep).toBe('FP_ASSIGN');

        engine.moves.assignMinion('minion-2', 'comp-1');
        expect(engine.getG().skirmishes[0]?.minionIds).toHaveLength(2);
        expect(engine.getCtx().phase).toBe('skirmish');
    });
});
