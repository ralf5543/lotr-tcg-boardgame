import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createFollower,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('devSetPhase', () => {
    it('en sautant vers l’affectation, nettoie le début de manœuvre (Suivant Ombre)', () => {
        const follower = createFollower({
            id: 'sh-follower',
            kind: 'SHADOW',
            aidCost: { type: 'TWILIGHT', amount: 1 },
        });

        const engine = createEngineClient({
            startPhase: 'startOfManeuver',
            playerID: '1',
            G: {
                twilightPool: 4,
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '1': createPlayerState('1', {
                        supportArea: [follower],
                    }),
                },
            },
        });

        expect(engine.getCtx().phase).toBe('startOfManeuver');
        expect(engine.getG().maneuverStep).toBe('MANEUVER_START');
        expect(engine.getG().startOfPhaseState?.players['1']?.isDone).toBe(
            false
        );

        engine.moves.devSetPhase('startOfAssignment');

        expect(engine.getCtx().phase).toBe('assignment');
        expect(engine.getG().maneuverStep).toBeUndefined();
        expect(engine.getG().startOfPhaseState).toBeUndefined();
        expect(engine.getG().actionWindow).toBeUndefined();
        expect(engine.getG().players['1']?.supportArea[0]?.id).toBe(
            'sh-follower'
        );
        expect(engine.getG().players['1']?.supportArea[0]?.isActionable).toBe(
            false
        );
    });
});
