import { describe, expect, it } from 'vitest';
import { createEngineClient, passBothActionWindows } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('phase d’archerie', () => {
    it('sans archer, enchaîne vers l’affectation s’il reste des séides', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            G: {
                battlefield: [createMinion({ id: 'minion-1' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        passBothActionWindows(engine);

        expect(engine.getCtx().phase).toBe('assignment');
    });

    it('tue le dernier séide par archerie FP → regroupement', () => {
        const minion = createMinion({
            id: 'minion-1',
            vitality: 1,
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            G: {
                battlefield: [minion],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'legolas',
                                keywords: ['ARCHER'],
                            }),
                        ],
                    }),
                },
            },
        });

        passBothActionWindows(engine);

        expect(engine.getG().archeryState?.step).toBe('SHADOW_ASSIGN');

        engine.updatePlayerID('1');
        engine.moves.assignArcheryWound('minion-1');

        expect(engine.getCtx().phase).toBe('regroup');
        expect(engine.getG().battlefield).toHaveLength(0);
    });

    it('blesse un compagnon (archerie Ombre) puis passe à l’affectation', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            G: {
                battlefield: [
                    createMinion({
                        id: 'archer-orc',
                        keywords: ['ARCHER'],
                        vitality: 3,
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                vitality: 4,
                            }),
                        ],
                    }),
                },
            },
        });

        passBothActionWindows(engine);

        expect(engine.getG().archeryState?.step).toBe('FP_ASSIGN');
        expect(engine.getG().archeryState?.fpRemainingWounds).toBe(1);

        engine.updatePlayerID('0');
        engine.moves.assignArcheryWound('comp-1');

        expect(engine.getCtx().phase).toBe('assignment');
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(engine.getG().battlefield).toHaveLength(1);
    });
});
