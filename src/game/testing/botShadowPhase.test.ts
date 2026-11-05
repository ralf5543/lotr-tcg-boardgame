import { describe, expect, it } from 'vitest';
import type { Ctx } from 'boardgame.io';
import { enumerateBotMoves } from '../bot/enumerateBotMoves';
import { isBotToAct } from '../bot/isBotToAct';
import {
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import { createEngineClient } from './createEngineClient';

function shadowCtx(extra: Partial<Ctx> = {}): Ctx {
    return {
        numPlayers: 2,
        turn: 1,
        currentPlayer: '1',
        phase: 'shadow',
        playOrder: ['0', '1'],
        playOrderPos: 1,
        activePlayers: { '0': 'play', '1': 'play' },
        ...extra,
    } as Ctx;
}

describe('BOT — phase Ombre', () => {
    it('isBotToAct ignore assignmentStep fantôme hors phase assignment', () => {
        // Comme l’état initial de partie : assignmentStep reste FP_ASSIGN
        // jusqu’à la 1ʳᵉ assignation, y compris en Ombre.
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 14,
            assignmentStep: 'FP_ASSIGN',
        });
        expect(isBotToAct(G, shadowCtx(), '1')).toBe(true);
        expect(isBotToAct(G, shadowCtx(), '0')).toBe(false);
    });

    it('enumerate propose playShadowCard puis endShadowPhase', () => {
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 12,
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [
                        createMinion({
                            id: 'orc-1',
                            instanceId: 'orc-1',
                            twilightCost: 2,
                        }),
                    ],
                }),
            },
        });

        expect(isBotToAct(G, shadowCtx(), '1')).toBe(true);
        const moves = enumerateBotMoves(G, shadowCtx(), '1');
        expect(moves.map((m) => m.move)).toEqual([
            'playShadowCard',
            'endShadowPhase',
        ]);
    });

    it('avec crépuscule 12, le siège Ombre peut jouer puis finir la phase', () => {
        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                fpPlayerId: '0',
                twilightPool: 12,
                players: {
                    '0': createPlayerState('0'),
                    '1': createPlayerState('1', {
                        hand: [
                            createMinion({
                                id: 'orc-cheap',
                                instanceId: 'orc-cheap',
                                twilightCost: 2,
                                name: 'Orque',
                            }),
                        ],
                    }),
                },
            },
        });

        const G0 = engine.getG();
        const ctx0 = engine.getCtx();
        expect(ctx0.phase).toBe('shadow');

        const specs = enumerateBotMoves(G0, ctx0 as Ctx, '1');
        expect(specs[0]?.move).toBe('playShadowCard');

        engine.moves.playShadowCard(0);
        expect(engine.getG().battlefield.some((c) => c.type === 'MINION')).toBe(
            true
        );

        engine.moves.endShadowPhase();
        const phase = engine.getCtx().phase;
        expect([
            'startOfManeuver',
            'maneuver',
            'regroup',
            'startOfRegroup',
        ]).toContain(phase);
    });
});
