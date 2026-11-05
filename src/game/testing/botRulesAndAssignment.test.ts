import { describe, expect, it } from 'vitest';
import type { Ctx } from 'boardgame.io';
import { enumerateBotMoves } from '../bot/enumerateBotMoves';
import { isBotToAct } from '../bot/isBotToAct';
import { getCardById } from '../cardsData';
import {
    createCompanion,
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

function assignmentCtx(extra: Partial<Ctx> = {}): Ctx {
    return {
        numPlayers: 2,
        turn: 1,
        currentPlayer: '0',
        phase: 'assignment',
        playOrder: ['0', '1'],
        playOrderPos: 0,
        activePlayers: { '0': 'play', '1': 'play' },
        ...extra,
    } as Ctx;
}

describe('BOT — règles de jeu Ombre', () => {
    it('refuse Wandering Hillman sans Homme Men en jeu', () => {
        const hillman = {
            ...getCardById('15U94')!,
            instanceId: 'hillman-1',
        };
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 20,
            battlefield: [],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            instanceId: 'frodo',
                            title: 'Frodo',
                            race: 'HOBBIT',
                        }),
                    ],
                }),
                '1': createPlayerState('1', {
                    hand: [hillman],
                }),
            },
        });

        const moves = enumerateBotMoves(G, shadowCtx(), '1');
        expect(moves.map((m) => m.move)).toEqual(['endShadowPhase']);
    });

    it('refuse Souci (Worry) sans Ourouk-Haï à affaiblir', () => {
        const worry = {
            ...getCardById('1U162')!,
            instanceId: 'worry-1',
        };
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 20,
            battlefield: [
                createMinion({
                    id: 'orc',
                    instanceId: 'orc',
                    race: 'ORC',
                    culture: 'MORIA',
                }),
            ],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [worry],
                    supportArea: [],
                }),
            },
        });

        const moves = enumerateBotMoves(G, shadowCtx(), '1');
        expect(moves.map((m) => m.move)).toEqual(['endShadowPhase']);
    });

    it('refuse une 2ᵉ copie unique déjà en soutien', () => {
        const worryInPlay = {
            ...getCardById('1U162')!,
            instanceId: 'worry-inplay',
        };
        const worryHand = {
            ...getCardById('1U162')!,
            instanceId: 'worry-hand',
        };
        const uruk = createMinion({
            id: 'uruk',
            instanceId: 'uruk',
            race: 'URUK-HAI',
            culture: 'ISENGARD',
            vitality: 3,
        });
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 20,
            battlefield: [uruk],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [worryHand],
                    supportArea: [worryInPlay],
                }),
            },
        });

        const moves = enumerateBotMoves(G, shadowCtx(), '1');
        expect(moves.map((m) => m.move)).toEqual(['endShadowPhase']);
    });

    it('playShadowCard moteur refuse aussi Hillman illégal', () => {
        const hillman = {
            ...getCardById('15U94')!,
            instanceId: 'hillman-1',
        };
        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                fpPlayerId: '0',
                twilightPool: 20,
                battlefield: [],
                players: {
                    '0': createPlayerState('0'),
                    '1': createPlayerState('1', {
                        hand: [hillman],
                    }),
                },
            },
        });

        engine.moves.playShadowCard(0);
        // boardgame.io avale INVALID_MOVE ; l’état ne doit pas bouger.
        expect(engine.getG().players['1']?.hand).toHaveLength(1);
        expect(engine.getG().battlefield).toHaveLength(0);
    });
});

describe('BOT — escarmouche après résolution', () => {
    it('ne rappelle pas resolve : cleanupPendingDeaths si déjà résolu', () => {
        const G = createGameState({
            fpPlayerId: '1',
            activeSkirmishId: 'sk-1',
            lastWoundedCardIds: ['frodo-1'],
            pendingDeadCardIds: ['frodo-1'],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'frodo-1',
                    minionIds: ['orc-1'],
                    resolved: true,
                },
            ],
            battlefield: [
                createMinion({ id: 'orc', instanceId: 'orc-1' }),
            ],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            instanceId: 'frodo-1',
                            title: 'Frodo',
                            isDead: true,
                            wounds: 4,
                            vitality: 3,
                        }),
                    ],
                }),
            },
        });

        const moves = enumerateBotMoves(
            G,
            {
                numPlayers: 2,
                turn: 1,
                currentPlayer: '1',
                phase: 'skirmish',
                playOrder: ['0', '1'],
                playOrderPos: 1,
                activePlayers: { '0': 'play', '1': 'play' },
            } as Ctx,
            '1'
        );
        expect(moves.map((m) => m.move)).toEqual(['cleanupPendingDeaths']);
        expect(moves.map((m) => m.move)).not.toContain('resolveActiveSkirmish');
    });
});

describe('BOT — affectation', () => {
    it('en FP_ASSIGN, si le 1ᵉʳ compagnon est plein → autre cible ou céder', () => {
        const boromir = createCompanion({
            id: 'boromir',
            instanceId: 'boromir-1',
            title: 'Boromir',
        });
        const sam = createCompanion({
            id: 'sam',
            instanceId: 'sam-1',
            title: 'Sam',
        });
        const G = createGameState({
            fpPlayerId: '1',
            assignmentStep: 'FP_ASSIGN',
            battlefield: [
                createMinion({ id: 'shelob', instanceId: 'shelob-1' }),
            ],
            skirmishes: [
                {
                    id: 'sk-boromir',
                    companionId: 'boromir-1',
                    minionIds: ['gollum-1'],
                },
            ],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [boromir, sam],
                }),
            },
        });

        const moves = enumerateBotMoves(G, assignmentCtx(), '1');
        expect(moves[0]).toEqual({
            move: 'assignMinion',
            args: ['shelob-1', 'sam-1'],
        });
    });

    it('en FP_ASSIGN, tous pleins → yieldAssignmentToShadow', () => {
        const boromir = createCompanion({
            id: 'boromir',
            instanceId: 'boromir-1',
            title: 'Boromir',
        });
        const G = createGameState({
            fpPlayerId: '1',
            assignmentStep: 'FP_ASSIGN',
            battlefield: [
                createMinion({ id: 'shelob', instanceId: 'shelob-1' }),
            ],
            skirmishes: [
                {
                    id: 'sk-boromir',
                    companionId: 'boromir-1',
                    minionIds: ['gollum-1'],
                },
            ],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [boromir],
                }),
            },
        });

        const moves = enumerateBotMoves(G, assignmentCtx(), '1');
        expect(moves[0]?.move).toBe('yieldAssignmentToShadow');
    });

    it('en FP_ASSIGN, le BOT PL affecte un séide', () => {
        const G = createGameState({
            fpPlayerId: '1',
            assignmentStep: 'FP_ASSIGN',
            battlefield: [
                createMinion({
                    id: 'orc',
                    instanceId: 'orc-1',
                }),
            ],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            instanceId: 'frodo-1',
                            title: 'Frodo',
                        }),
                    ],
                }),
            },
            skirmishes: [],
        });

        expect(isBotToAct(G, assignmentCtx(), '1')).toBe(true);
        const moves = enumerateBotMoves(G, assignmentCtx(), '1');
        expect(moves[0]).toEqual({
            move: 'assignMinion',
            args: ['orc-1', 'frodo-1'],
        });
    });

    it('en SHADOW_ASSIGN, le BOT Ombre affecte un séide', () => {
        const G = createGameState({
            fpPlayerId: '0',
            assignmentStep: 'SHADOW_ASSIGN',
            battlefield: [
                createMinion({
                    id: 'orc',
                    instanceId: 'orc-1',
                }),
            ],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            instanceId: 'frodo-1',
                            title: 'Frodo',
                        }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
            skirmishes: [],
        });

        expect(isBotToAct(G, assignmentCtx(), '1')).toBe(true);
        const moves = enumerateBotMoves(G, assignmentCtx(), '1');
        expect(moves[0]).toEqual({
            move: 'assignMinion',
            args: ['orc-1', 'frodo-1'],
        });
    });
});
