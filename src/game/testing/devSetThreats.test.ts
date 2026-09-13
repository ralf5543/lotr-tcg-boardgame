import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import { createCompanion, createPlayerState } from './createGameState';

describe('devSetThreats', () => {
    it('plafonne à l’ajout au nombre de compagnons FP', () => {
        const engine = createEngineClient({
            startPhase: 'setup',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'frodo' }),
                            createCompanion({ id: 'sam' }),
                        ],
                        threats: 0,
                    }),
                },
            },
        });

        expect(typeof engine.moves.devSetThreats).toBe('function');
        engine.moves.devSetThreats(1);
        expect(engine.getG().players['0']?.threats).toBe(1);
        engine.moves.devSetThreats(1);
        expect(engine.getG().players['0']?.threats).toBe(2);
        engine.moves.devSetThreats(1);
        expect(engine.getG().players['0']?.threats).toBe(2);

        engine.moves.devSetThreats(-1);
        expect(engine.getG().players['0']?.threats).toBe(1);

        engine.stop();
    });

    it('n’ajoute rien s’il n’y a pas de compagnon', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [],
                        threats: 0,
                    }),
                },
            },
        });

        engine.moves.devSetThreats(1);
        expect(engine.getG().players['0']?.threats).toBe(0);
        engine.stop();
    });
});
