import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('Embuscade (AMBUSH) à l’affectation', () => {
    it('ajoute X Crépuscule quand le FP affecte un séide Ambush X', () => {
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                twilightPool: 3,
                battlefield: [
                    createMinion({
                        id: 'minion-ambush',
                        keywords: ['AMBUSH 2'],
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        engine.moves.assignMinion('minion-ambush', 'comp-1');

        expect(engine.getG().twilightPool).toBe(5);
        expect(engine.getG().skirmishes[0]?.minionIds).toEqual([
            'minion-ambush',
        ]);
    });

    it('n’ajoute rien si c’est l’Ombre qui affecte le séide Ambush', () => {
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                twilightPool: 4,
                battlefield: [
                    createMinion({
                        id: 'minion-ambush',
                        keywords: ['AMBUSH 2'],
                    }),
                    createMinion({ id: 'minion-2' }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        engine.moves.assignMinion('minion-2', 'comp-1');
        expect(engine.getG().assignmentStep).toBe('SHADOW_ASSIGN');
        expect(engine.getG().twilightPool).toBe(4);

        engine.updatePlayerID('1');
        engine.moves.assignMinion('minion-ambush', 'comp-1');

        expect(engine.getG().twilightPool).toBe(4);
        expect(engine.getG().skirmishes[0]?.minionIds).toEqual([
            'minion-2',
            'minion-ambush',
        ]);
    });

    it('n’ajoute rien après cession : l’Ombre affecte le séide Ambush', () => {
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                twilightPool: 1,
                battlefield: [
                    createMinion({
                        id: 'minion-ambush',
                        keywords: ['AMBUSH 3'],
                    }),
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

        engine.moves.yieldAssignmentToShadow();
        engine.updatePlayerID('1');
        engine.moves.assignMinion('minion-ambush', 'comp-1');

        expect(engine.getG().twilightPool).toBe(1);
    });

    it('prend en compte Ambush conféré par un attachement (grantsKeywords)', () => {
        const bow = createCard({
            id: 'raider-bow',
            kind: 'SHADOW',
            type: 'POSSESSION',
            culture: 'RAIDER',
            grantsKeywords: ['AMBUSH 5'],
        });

        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                twilightPool: 0,
                battlefield: [
                    createMinion({
                        id: 'minion-raider',
                        attachments: [bow],
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        engine.moves.assignMinion('minion-raider', 'comp-1');

        expect(engine.getG().twilightPool).toBe(5);
    });

    it('cumule Ambush du séide et de l’attachement', () => {
        const bow = createCard({
            id: 'bow',
            kind: 'SHADOW',
            type: 'POSSESSION',
            grantsKeywords: ['AMBUSH 1'],
        });

        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                twilightPool: 0,
                battlefield: [
                    createMinion({
                        id: 'minion-ambush',
                        keywords: ['AMBUSH 2'],
                        attachments: [bow],
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        engine.moves.assignMinion('minion-ambush', 'comp-1');

        expect(engine.getG().twilightPool).toBe(3);
    });

    it('déclenche aussi l’Embuscade en passe acharnée si le FP assigne', () => {
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                pendingFierceAssignment: true,
                twilightPool: 0,
                battlefield: [
                    createMinion({
                        id: 'minion-fierce',
                        keywords: ['FIERCE', 'AMBUSH 1'],
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        expect(engine.getG().isFierceAssignment).toBe(true);

        engine.moves.assignMinion('minion-fierce', 'comp-1');

        expect(engine.getG().twilightPool).toBe(1);
    });
});
