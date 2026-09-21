import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('cleanupPendingDeaths / blessures de menaces', () => {
    it('convertit les menaces en blessures à assigner quand un compagnon meurt', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        threats: 2,
                        fellowshipArea: [
                            createCompanion({
                                id: 'aragorn',
                                vitality: 1,
                            }),
                            createCompanion({
                                id: 'frodo',
                                vitality: 4,
                            }),
                            createCompanion({
                                id: 'sam',
                                vitality: 4,
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('aragorn');
        engine.moves.cleanupPendingDeaths();

        const G = engine.getG();
        expect(G.players['0']?.deadPile[0]?.id).toBe('aragorn');
        expect(G.players['0']?.threats).toBe(0);
        expect(G.threatWoundsToAssign).toBe(2);

        engine.moves.assignThreatWound('frodo');
        expect(engine.getG().players['0']?.fellowshipArea.find(
            (c) => c.id === 'frodo'
        )?.wounds).toBe(1);
        expect(engine.getG().threatWoundsToAssign).toBe(1);

        engine.moves.assignThreatWound('sam');
        expect(engine.getG().threatWoundsToAssign).toBeUndefined();
        expect(
            engine.getG().players['0']?.fellowshipArea.find((c) => c.id === 'sam')
                ?.wounds
        ).toBe(1);

        engine.stop();
    });

    it('refuse d’assigner une blessure de menaces à un allié', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        threats: 1,
                        fellowshipArea: [
                            createCompanion({ id: 'dead-one', vitality: 1 }),
                            createCompanion({ id: 'frodo', vitality: 4 }),
                        ],
                        supportArea: [
                            createCompanion({
                                id: 'elrond',
                                type: 'ALLY',
                                vitality: 3,
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('dead-one');
        engine.moves.cleanupPendingDeaths();
        expect(engine.getG().threatWoundsToAssign).toBe(1);

        engine.moves.assignThreatWound('elrond');
        expect(engine.getG().threatWoundsToAssign).toBe(1);
        expect(
            engine.getG().players['0']?.supportArea.find((c) => c.id === 'elrond')
                ?.wounds || 0
        ).toBe(0);

        engine.stop();
    });

    it('déclenche aussi la conversion à la mort d’un allié', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        threats: 2,
                        fellowshipArea: [
                            createCompanion({ id: 'frodo', vitality: 4 }),
                            createCompanion({ id: 'sam', vitality: 4 }),
                        ],
                        supportArea: [
                            createCompanion({
                                id: 'elrond',
                                type: 'ALLY',
                                vitality: 1,
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('elrond');
        engine.moves.cleanupPendingDeaths();

        const G = engine.getG();
        expect(G.players['0']?.supportArea).toHaveLength(0);
        expect(G.players['0']?.deadPile[0]?.id).toBe('elrond');
        expect(G.players['0']?.threats).toBe(0);
        expect(G.threatWoundsToAssign).toBe(2);

        engine.stop();
    });

    it('ne convertit rien si un séide meurt', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', { threats: 2 }),
                },
                battlefield: [
                    createMinion({
                        id: 'orc-1',
                        vitality: 1,
                    }),
                ],
            },
        });

        engine.moves.applyWound('orc-1');
        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().players['0']?.threats).toBe(2);
        expect(engine.getG().threatWoundsToAssign).toBeUndefined();

        engine.stop();
    });

    it('ne relance pas une cascade si un compagnon meurt pendant l’assignation', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        threats: 2,
                        fellowshipArea: [
                            createCompanion({ id: 'aragorn', vitality: 1 }),
                            createCompanion({ id: 'boromir', vitality: 1 }),
                            createCompanion({ id: 'frodo', vitality: 4 }),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('aragorn');
        engine.moves.cleanupPendingDeaths();
        expect(engine.getG().threatWoundsToAssign).toBe(2);
        expect(engine.getG().players['0']?.threats).toBe(0);

        engine.moves.assignThreatWound('boromir');
        expect(engine.getG().players['0']?.fellowshipArea.find(
            (c) => c.id === 'boromir'
        )?.isDead).toBe(true);
        expect(engine.getG().threatWoundsToAssign).toBe(1);

        engine.moves.cleanupPendingDeaths();
        expect(engine.getG().players['0']?.threats).toBe(0);
        expect(engine.getG().threatWoundsToAssign).toBe(1);

        engine.moves.assignThreatWound('frodo');
        expect(engine.getG().threatWoundsToAssign).toBeUndefined();
        expect(
            engine.getG().players['0']?.fellowshipArea.find((c) => c.id === 'frodo')
                ?.wounds
        ).toBe(1);

        engine.stop();
    });

    it('laisse une condition en zone de soutien quand un allié meurt', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        threats: 1,
                        fellowshipArea: [
                            createCompanion({ id: 'frodo', vitality: 4 }),
                        ],
                        supportArea: [
                            createCompanion({
                                id: 'elrond',
                                type: 'ALLY',
                                vitality: 1,
                            }),
                            createCard({
                                id: 'condition',
                                type: 'CONDITION',
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('elrond');
        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().players['0']?.supportArea).toHaveLength(1);
        expect(engine.getG().players['0']?.supportArea[0]?.id).toBe('condition');

        engine.stop();
    });

    it('refuse de démarrer un autre combat tant que des menaces restent à assigner', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                threatWoundsToAssign: 2,
                battlefield: [
                    createMinion({ id: 'minion-1', strength: 4, vitality: 3 }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'frodo',
                                vitality: 4,
                                strength: 3,
                            }),
                            createCompanion({
                                id: 'sam',
                                vitality: 4,
                                strength: 3,
                            }),
                        ],
                    }),
                },
                skirmishes: [
                    {
                        id: 'skirmish_frodo',
                        companionId: 'frodo',
                        minionIds: ['minion-1'],
                    },
                ],
            },
        });

        engine.moves.selectSkirmish('skirmish_frodo');
        expect(engine.getG().activeSkirmishId).toBeUndefined();
        expect(engine.getG().threatWoundsToAssign).toBe(2);

        engine.moves.assignThreatWound('frodo');
        engine.moves.assignThreatWound('sam');
        expect(engine.getG().threatWoundsToAssign).toBeUndefined();

        engine.moves.selectSkirmish('skirmish_frodo');
        expect(engine.getG().activeSkirmishId).toBe('skirmish_frodo');

        engine.stop();
    });
});
