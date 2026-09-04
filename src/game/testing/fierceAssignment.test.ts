import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('affectation acharnée (FIERCE)', () => {
    it('relance une passe d’affectation si un séide FIERCE survit au combat', () => {
        const companion = createCompanion({
            id: 'comp-1',
            strength: 4,
            vitality: 4,
        });
        const fierceMinion = createMinion({
            id: 'minion-fierce',
            strength: 3,
            vitality: 3,
            keywords: ['FIERCE'],
        });

        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                battlefield: [fierceMinion],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [companion],
                    }),
                },
            },
        });

        engine.moves.assignMinion('minion-fierce', 'comp-1');
        expect(engine.getCtx().phase).toBe('skirmish');

        engine.moves.selectSkirmish('skirmish_comp-1');
        engine.moves.resolveActiveSkirmish();
        engine.moves.clearSkirmishAnimation();

        expect(engine.getCtx().phase).toBe('assignment');
        expect(engine.getG().isFierceAssignment).toBe(true);
        expect(engine.getG().battlefield[0]?.isDead).not.toBe(true);
        expect(engine.getG().battlefield[0]?.wounds).toBe(1);

        engine.moves.assignMinion('minion-fierce', 'comp-1');
        expect(engine.getCtx().phase).toBe('skirmish');

        engine.moves.selectSkirmish('skirmish_comp-1');
        engine.moves.resolveActiveSkirmish();
        engine.moves.clearSkirmishAnimation();

        expect(['startOfRegroup', 'regroup']).toContain(engine.getCtx().phase);
    });

    it('en passe acharnée, refuse d’assigner un séide non-FIERCE', () => {
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                pendingFierceAssignment: true,
                battlefield: [
                    createMinion({
                        id: 'minion-fierce',
                        keywords: ['FIERCE'],
                    }),
                    createMinion({ id: 'minion-normal' }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        expect(engine.getG().isFierceAssignment).toBe(true);

        engine.moves.assignMinion('minion-normal', 'comp-1');
        expect(engine.getG().skirmishes).toHaveLength(0);
        expect(engine.getCtx().phase).toBe('assignment');

        engine.moves.assignMinion('minion-fierce', 'comp-1');
        expect(engine.getG().skirmishes[0]?.minionIds).toEqual([
            'minion-fierce',
        ]);
    });
});
