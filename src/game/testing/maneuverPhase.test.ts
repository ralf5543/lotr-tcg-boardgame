import { describe, expect, it } from 'vitest';
import {
    createEngineClient,
    passBothActionWindows,
} from './createEngineClient';
import { createMinion } from './createGameState';

describe('phase de manœuvre', () => {
    it('passe à l’archerie quand les deux joueurs passent', () => {
        const engine = createEngineClient({
            startPhase: 'maneuver',
            G: {
                battlefield: [createMinion({ id: 'orc' })],
            },
        });

        expect(engine.getG().actionWindow?.isOpen).toBe(true);

        passBothActionWindows(engine);

        expect(['startOfArchery', 'archery']).toContain(engine.getCtx().phase);
    });
});
