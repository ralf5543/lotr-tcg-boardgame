import { describe, expect, it } from 'vitest';
import { createEngineClient, skipAssignmentActions } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

const TREEBEARD_ASSIGN: Ability = {
    id: '0P21:0',
    phases: ['ASSIGNMENT'],
    cost: [
        {
            exert: [
                {
                    count: 1,
                    target: [['UNBOUND', 'HOBBIT']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [{ type: 'ALLOW_SKIRMISH', target: 'SELF' }],
    source: 'SELF',
};

describe('fenêtre d’action d’affectation', () => {
    it('ouvre une fenêtre FP d’abord, comme les autres phases', () => {
        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        expect(engine.getG().assignmentStep).toBe('ACTIONS');
        expect(engine.getG().actionWindow?.isOpen).toBe(true);
        expect(engine.getG().actionWindow?.activePlayerId).toBe('0');

        engine.moves.passActionWindow();
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');
        expect(engine.getG().assignmentStep).toBe('ACTIONS');

        engine.updatePlayerID('1');
        engine.moves.passActionWindow();
        expect(engine.getG().assignmentStep).toBe('FP_ASSIGN');
        expect(engine.getG().actionWindow).toBeUndefined();
    });

    it('refuse d’assigner un Peu hâtif tant qu’il n’est pas autorisé', () => {
        const treebeard = createCompanion({
            id: '0P21',
            title: 'Treebeard',
            race: 'ENT',
            keywords: ['UNHASTY'],
            vitality: 4,
            actionPhases: ['ASSIGNMENT', 'SKIRMISH'],
            abilities: [TREEBEARD_ASSIGN],
        });
        const merry = createCompanion({
            id: '1C303',
            title: 'Merry',
            race: 'HOBBIT',
            vitality: 4,
        });

        const engine = createEngineClient({
            startPhase: 'assignment',
            playerID: '0',
            G: {
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [treebeard, merry],
                    }),
                },
            },
        });

        engine.moves.assignMinion('orc', '0P21');
        expect(engine.getG().skirmishes).toHaveLength(0);

        engine.moves.activateAbility('0P21', '0P21:0', '1C303');
        const after = engine.getG().players['0']?.fellowshipArea || [];
        expect(after.find((c) => c.id === '1C303')?.wounds).toBe(1);
        expect(after.find((c) => c.id === '0P21')?.allowedToSkirmish).toBe(
            true
        );

        skipAssignmentActions(engine);
        engine.moves.assignMinion('orc', '0P21');
        expect(engine.getG().skirmishes[0]?.companionId).toBe('0P21');
        expect(engine.getG().skirmishes[0]?.minionIds).toEqual(['orc']);
    });
});
