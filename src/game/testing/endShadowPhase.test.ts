import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import { createMinion } from './createGameState';

describe('endShadowPhase', () => {
    it('passe au regroupement s’il n’y a aucun séide en jeu', () => {
        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
        });

        engine.moves.endShadowPhase();

        expect(engine.getCtx().phase).toBe('regroup');
    });

    it('enchaîne vers la manœuvre s’il reste au moins un séide', () => {
        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                battlefield: [createMinion({ id: 'p1-minion-1' })],
            },
        });

        engine.moves.endShadowPhase();

        // startOfManeuver skippe tout seul s’il n’y a rien à jouer
        expect(engine.getCtx().phase).toBe('maneuver');
    });

    it('refuse que le joueur des Peuples Libres termine la phase d’Ombre', () => {
        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '0',
        });

        engine.moves.endShadowPhase();

        expect(engine.getCtx().phase).toBe('shadow');
    });
});
