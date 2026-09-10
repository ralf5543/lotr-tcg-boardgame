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
        expect(engine.getG().archeryState).toBeUndefined();
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
        expect(engine.getG().archeryState).toBeUndefined();
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(engine.getG().battlefield).toHaveLength(1);
    });

    it('reste en archerie si une réponse s’ouvre sur la dernière flèche Ombre', () => {
        const shaman = createMinion({
            id: '3C59',
            title: 'Isengard Shaman',
            culture: 'ISENGARD',
            race: 'ORC',
            vitality: 2,
            actionPhases: ['RESPONSE'],
            abilities: [
                {
                    id: '3C59:0',
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'ABOUT_TO_WOUND',
                        target: [['ISENGARD', 'ORC']],
                    },
                    cost: [{ removeTwilight: 2 }],
                    effects: [{ type: 'PREVENT_WOUND' }],
                    source: 'SELF',
                },
            ],
        });
        const grunt = createMinion({
            id: 'isengard-orc',
            title: 'Isengard Orc',
            culture: 'ISENGARD',
            race: 'ORC',
            vitality: 3,
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 3,
                battlefield: [shaman, grunt],
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
        engine.moves.assignArcheryWound('isengard-orc');

        expect(engine.getCtx().phase).toBe('archery');
        expect(engine.getG().responseWindow?.isOpen).toBe(true);
        expect(
            engine.getG().battlefield.find((c) => c.id === 'isengard-orc')
                ?.wounds || 0
        ).toBe(0);

        engine.moves.passResponseWindow();

        expect(engine.getCtx().phase).toBe('assignment');
        expect(
            engine.getG().battlefield.find((c) => c.id === 'isengard-orc')
                ?.wounds
        ).toBe(1);
    });
});
