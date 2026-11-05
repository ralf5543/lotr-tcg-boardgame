import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import {
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Game } from 'boardgame.io';
import type { GameState } from '../types';
import { LotrGame } from '../index';

describe('BOT — client solo MAKE_MOVE siège 1', () => {
    it('endShadowPhase appliqué localement change la phase', () => {
        const phases = Object.fromEntries(
            Object.entries(LotrGame.phases ?? {}).map(([name, phase]) => [
                name,
                { ...phase, start: name === 'shadow' },
            ])
        );

        const game = {
            ...LotrGame,
            seed: 0,
            setup: () =>
                createGameState({
                    fpPlayerId: '0',
                    twilightPool: 12,
                    players: {
                        '0': createPlayerState('0'),
                        '1': createPlayerState('1', {
                            hand: [
                                createMinion({
                                    id: 'orc',
                                    twilightCost: 2,
                                }),
                            ],
                        }),
                    },
                }),
            phases,
        } as Game<GameState>;

        const client = Client({
            game,
            numPlayers: 2,
            playerID: '0',
            debug: false,
        });
        client.start();

        expect(client.getState()?.ctx.phase).toBe('shadow');

        (
            client as unknown as {
                store: { dispatch: (a: unknown) => void };
            }
        ).store.dispatch({
            type: 'MAKE_MOVE',
            payload: {
                type: 'playShadowCard',
                args: [0],
                playerID: '1',
            },
        });

        expect(
            (client.getState()?.G as GameState).battlefield.some(
                (c) => c.type === 'MINION'
            )
        ).toBe(true);

        (
            client as unknown as {
                store: { dispatch: (a: unknown) => void };
            }
        ).store.dispatch({
            type: 'MAKE_MOVE',
            payload: {
                type: 'endShadowPhase',
                args: [],
                playerID: '1',
            },
        });

        const phase = client.getState()?.ctx.phase;
        expect([
            'startOfManeuver',
            'maneuver',
            'regroup',
            'startOfRegroup',
        ]).toContain(phase);

        client.stop();
    });
});
