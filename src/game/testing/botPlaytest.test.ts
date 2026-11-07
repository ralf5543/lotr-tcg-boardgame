import { describe, expect, it } from 'vitest';
import type { Ctx } from 'boardgame.io';
import { enumerateBotMoves } from '../bot/enumerateBotMoves';
import { isBotToAct, pendingNamedActor } from '../bot/isBotToAct';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

function ctx(phase: string, extra: Partial<Ctx> = {}): Ctx {
    return {
        numPlayers: 2,
        turn: 0,
        currentPlayer: '0',
        phase,
        playOrder: ['0', '1'],
        playOrderPos: 0,
        activePlayers: { '0': 'play', '1': 'play' },
        ...extra,
    } as Ctx;
}

describe('BOT playtest — isBotToAct / enumerate', () => {
    it('pendingNamedActor : fenêtre d’action prime', () => {
        const G = createGameState({
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'Test',
                message: 'x',
                canPass: true,
                passesCount: 0,
            },
        });
        expect(pendingNamedActor(G)).toBe('1');
        expect(isBotToAct(G, ctx('maneuver'), '1')).toBe(true);
        expect(isBotToAct(G, ctx('maneuver'), '0')).toBe(false);
    });

    it('setup enchère : les deux sièges peuvent miser', () => {
        const G = createGameState({
            setupState: {
                bids: { '0': null, '1': null },
                mulligans: { '0': null, '1': null },
                step: 'BIDDING',
            },
        });
        expect(isBotToAct(G, ctx('setup'), '1')).toBe(true);
        const moves = enumerateBotMoves(G, ctx('setup'), '1');
        expect(moves[0]?.move).toBe('submitBid');
        const bid = moves[0]?.args?.[0];
        expect(typeof bid).toBe('number');
        expect(bid).toBeGreaterThanOrEqual(0);
        expect(bid).toBeLessThanOrEqual(3);
    });

    it('phase Ombre : endShadowPhase si rien de jouable', () => {
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            players: {
                '0': createGameState().players['0']!,
                '1': {
                    ...createGameState().players['1']!,
                    hand: [
                        {
                            id: 'expensive',
                            instanceId: 'expensive-1',
                            kind: 'SHADOW',
                            type: 'MINION',
                            twilightCost: 9,
                            name: 'Cher',
                        } as any,
                    ],
                },
            },
        });
        expect(isBotToAct(G, ctx('shadow'), '1')).toBe(true);
        const moves = enumerateBotMoves(G, ctx('shadow'), '1');
        expect(moves[0]?.move).toBe('endShadowPhase');
    });

    it('phase Ombre : joue un séide abordable', () => {
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 3,
            players: {
                '0': createGameState().players['0']!,
                '1': {
                    ...createGameState().players['1']!,
                    hand: [
                        {
                            id: 'orc',
                            instanceId: 'orc-1',
                            kind: 'SHADOW',
                            type: 'MINION',
                            twilightCost: 2,
                            name: 'Orque',
                        } as any,
                    ],
                },
            },
        });
        const moves = enumerateBotMoves(G, ctx('shadow'), '1');
        expect(moves[0]).toEqual({ move: 'playShadowCard', args: [0] });
    });

    it('fenêtre d’action : passer', () => {
        const G = createGameState({
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'T',
                message: 'm',
                canPass: true,
                passesCount: 0,
            },
        });
        const moves = enumerateBotMoves(G, ctx('maneuver'), '1');
        expect(moves[0]?.move).toBe('passActionWindow');
    });

    it('hors tour logique : enumerate vide', () => {
        const G = createGameState({ fpPlayerId: '0' });
        expect(enumerateBotMoves(G, ctx('shadow'), '0')).toEqual([]);
    });

    it('phase Fellowship : joue un compagnon puis propose fin de phase', () => {
        const companion = createCompanion({
            id: 'boromir',
            instanceId: 'boromir-1',
            title: 'Boromir',
            twilightCost: 3,
        });
        const G = createGameState({
            fpPlayerId: '1',
            assignmentStep: 'FP_ASSIGN', // fantôme hors phase assignment
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [companion],
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            instanceId: 'frodo-1',
                            title: 'Frodo',
                        }),
                    ],
                }),
            },
        });
        expect(isBotToAct(G, ctx('fellowship'), '1')).toBe(true);
        const moves = enumerateBotMoves(G, ctx('fellowship'), '1');
        expect(moves.map((m) => m.move)).toEqual([
            'playCard',
            'endFellowshipPhase',
        ]);
        expect(moves[0]?.args).toEqual([0]);
    });

    it('phase Fellowship : fin de phase si rien de jouable', () => {
        const G = createGameState({
            fpPlayerId: '1',
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [
                        {
                            id: 'evt',
                            instanceId: 'evt-1',
                            kind: 'FREE_PEOPLE',
                            type: 'EVENT',
                            twilightCost: 0,
                            title: 'Event',
                            phases: ['FELLOWSHIP'],
                        } as any,
                    ],
                }),
            },
        });
        const moves = enumerateBotMoves(G, ctx('fellowship'), '1');
        expect(moves[0]?.move).toBe('endFellowshipPhase');
    });
});
