import { describe, expect, it } from 'vitest';
import {
    mayPlayAnotherCompanion,
    pickAssignmentByStrength,
    pickGreedyPhaseWoundAction,
    pickNextSkirmishId,
    pickSanctuaryHealTargetId,
    pickSkirmishCombatAction,
    pickWearRingResponse,
    shouldBotMoveAgain,
    shouldBotWearTheOneRing,
} from '../bot/heuristics';
import { enumerateBotMoves } from '../bot/enumerateBotMoves';
import type { Ctx } from 'boardgame.io';
import type { Ability } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const GIMLI_BOOST: Ability = {
    id: '0P12:0',
    phases: ['SKIRMISH'],
    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
    effects: [
        {
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 2,
            target: 'SELF',
            expiresAtPhase: 'SKIRMISH',
        },
    ],
    source: 'SELF',
};

function skirmishActionCtx(): Ctx {
    return {
        numPlayers: 2,
        turn: 1,
        currentPlayer: '1',
        phase: 'skirmish',
        playOrder: ['0', '1'],
        playOrderPos: 1,
        activePlayers: { '0': 'play', '1': 'play' },
    } as Ctx;
}

function assignmentCtx(): Ctx {
    return {
        numPlayers: 2,
        turn: 1,
        currentPlayer: '0',
        phase: 'assignment',
        playOrder: ['0', '1'],
        playOrderPos: 0,
        activePlayers: { '0': 'play', '1': 'play' },
    } as Ctx;
}

describe('BOT heuristique A1 — affectation par force', () => {
    it('PL : séide fort → compagnon qui peut gagner (pas le Porteur)', () => {
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            title: 'Aragorn',
            strength: 8,
        });
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo-1',
            title: 'Frodo',
            strength: 3,
            keywords: ['RING-BEARER'],
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            strength: 6,
        });
        const G = createGameState({
            fpPlayerId: '1',
            assignmentStep: 'FP_ASSIGN',
            battlefield: [orc],
            skirmishes: [],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    // Porteur en premier dans la liste (ancien comportement naïf).
                    fellowshipArea: [frodo, aragorn],
                }),
            },
        });

        expect(pickAssignmentByStrength(G, true)).toEqual({
            minionId: 'orc-1',
            companionId: 'aragorn-1',
        });
        expect(enumerateBotMoves(G, assignmentCtx(), '1')[0]).toEqual({
            move: 'assignMinion',
            args: ['orc-1', 'aragorn-1'],
        });
    });

    it('Ombre : cible le compagnon le plus faible qu’elle peut battre', () => {
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            strength: 8,
        });
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry-1',
            strength: 3,
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            strength: 5,
        });
        const G = createGameState({
            fpPlayerId: '0',
            assignmentStep: 'SHADOW_ASSIGN',
            battlefield: [orc],
            skirmishes: [],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [aragorn, merry],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(pickAssignmentByStrength(G, false)).toEqual({
            minionId: 'orc-1',
            companionId: 'merry-1',
        });
    });
});

describe('BOT heuristique A2 — double déplacement', () => {
    function fellowshipOf(n: number) {
        return Array.from({ length: n }, (_, i) =>
            createCompanion({
                id: `comp-${i}`,
                instanceId: `comp-${i}`,
                strength: 5,
            })
        );
    }
    function minionsOf(n: number) {
        return Array.from({ length: n }, (_, i) =>
            createMinion({
                id: `orc-${i}`,
                instanceId: `orc-${i}`,
                vitality: 2,
            })
        );
    }

    it('stop si séides ≥ ⅔ des compagnons (4/6)', () => {
        const G = createGameState({
            fpPlayerId: '1',
            battlefield: minionsOf(4),
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: fellowshipOf(6),
                    currentSiteIndex: 2,
                }),
            },
        });
        expect(shouldBotMoveAgain(G)).toBe(false);
    });

    it('avance si sous le seuil (3/6 < ⅔)', () => {
        const G = createGameState({
            fpPlayerId: '1',
            battlefield: minionsOf(3),
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: fellowshipOf(6),
                    currentSiteIndex: 2,
                }),
            },
        });
        expect(shouldBotMoveAgain(G)).toBe(true);
    });

    it('vers site 9 : avance à 3/5, stop à 4/5', () => {
        const base = {
            fpPlayerId: '1' as const,
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: fellowshipOf(5),
                    currentSiteIndex: 7, // prochain = site 9
                }),
            },
        };
        expect(
            shouldBotMoveAgain(
                createGameState({ ...base, battlefield: minionsOf(3) })
            )
        ).toBe(true);
        expect(
            shouldBotMoveAgain(
                createGameState({ ...base, battlefield: minionsOf(4) })
            )
        ).toBe(false);
    });

    it('FP_DECISION : endTurnChoice si trop de séides', () => {
        const G = createGameState({
            fpPlayerId: '1',
            regroupStep: 'FP_DECISION',
            movesThisTurn: 1,
            battlefield: minionsOf(4),
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: fellowshipOf(6),
                    currentSiteIndex: 2,
                }),
            },
        });
        const moves = enumerateBotMoves(
            G,
            {
                numPlayers: 2,
                turn: 1,
                currentPlayer: '1',
                phase: 'regroup',
                playOrder: ['0', '1'],
                playOrderPos: 1,
                activePlayers: { '0': 'play', '1': 'play' },
            } as Ctx,
            '1'
        );
        expect(moves[0]?.move).toBe('endTurnChoice');
    });
});

describe('BOT heuristique A3 — sanctuaire', () => {
    it('soigne d’abord un non-Porteur plus blessé', () => {
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo-1',
            keywords: ['RING-BEARER'],
            wounds: 3,
            vitality: 4,
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            wounds: 2,
            vitality: 4,
        });
        const G = createGameState({
            fpPlayerId: '1',
            sanctuaryHeal: { remaining: 5 },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [frodo, aragorn],
                }),
            },
        });
        expect(pickSanctuaryHealTargetId(G)).toBe('aragorn-1');
        expect(
            enumerateBotMoves(
                G,
                {
                    numPlayers: 2,
                    turn: 1,
                    currentPlayer: '1',
                    phase: 'startOfFellowship',
                    playOrder: ['0', '1'],
                    playOrderPos: 1,
                    activePlayers: { '0': 'play', '1': 'play' },
                } as Ctx,
                '1'
            )[0]
        ).toEqual({ move: 'assignSanctuaryHeal', args: ['aragorn-1'] });
    });
});

describe('BOT heuristique A4 — Anneau Unique', () => {
    const WEAR: Ability = {
        id: '1R1:0',
        phases: ['RESPONSE'],
        trigger: { type: 'ABOUT_TO_WOUND', target: 'BEARER' },
        cost: [],
        effects: [
            {
                type: 'WEAR_RING',
                expiresAtPhase: 'REGROUP',
                replaceWoundWithBurdens: 2,
            },
        ],
        source: 'ATTACHMENT',
    };

    function frodoWithRing(wounds: number, vitality = 4) {
        return createCompanion({
            id: 'frodo',
            instanceId: 'frodo-1',
            keywords: ['RING-BEARER'],
            wounds,
            vitality,
            attachments: [
                createCard({
                    id: '1R1',
                    instanceId: 'ring-1',
                    type: 'RING',
                    kind: 'FREE_PEOPLE',
                    title: 'The One Ring',
                    abilities: [WEAR],
                }),
            ],
        });
    }

    it('ne met pas l’Anneau si la blessure n’est pas mortelle', () => {
        const G = createGameState({
            fpPlayerId: '1',
            pendingEvent: {
                type: 'ABOUT_TO_WOUND',
                targetId: 'frodo-1',
                remaining: 1,
            },
            responseWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'R',
                message: 'm',
                canPass: true,
                passesCount: 0,
            },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [frodoWithRing(0, 4)],
                }),
            },
        });
        expect(shouldBotWearTheOneRing(G)).toBe(false);
        expect(pickWearRingResponse(G)).toBeNull();
        expect(
            enumerateBotMoves(
                G,
                {
                    numPlayers: 2,
                    turn: 1,
                    currentPlayer: '1',
                    phase: 'archery',
                    playOrder: ['0', '1'],
                    playOrderPos: 1,
                    activePlayers: { '0': 'play', '1': 'play' },
                } as Ctx,
                '1'
            )[0]?.move
        ).toBe('passResponseWindow');
    });

    it('met l’Anneau si la blessure tuerait le Porteur', () => {
        const G = createGameState({
            fpPlayerId: '1',
            pendingEvent: {
                type: 'ABOUT_TO_WOUND',
                targetId: 'frodo-1',
                remaining: 1,
            },
            responseWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'R',
                message: 'm',
                canPass: true,
                passesCount: 0,
            },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    // Vitalité restante 1 → 1 blessure = mort.
                    fellowshipArea: [frodoWithRing(3, 4)],
                }),
            },
        });
        expect(shouldBotWearTheOneRing(G)).toBe(true);
        expect(pickWearRingResponse(G)).toEqual({
            sourceInstanceId: 'ring-1',
            abilityId: '1R1:0',
        });
        expect(
            enumerateBotMoves(
                G,
                {
                    numPlayers: 2,
                    turn: 1,
                    currentPlayer: '1',
                    phase: 'archery',
                    playOrder: ['0', '1'],
                    playOrderPos: 1,
                    activePlayers: { '0': 'play', '1': 'play' },
                } as Ctx,
                '1'
            )[0]
        ).toEqual({
            move: 'activateAbility',
            args: ['ring-1', '1R1:0'],
        });
    });
});

describe('BOT heuristique A5 — boost seulement si ça retourne le combat', () => {
    function gimliState(opts: {
        gimliStrength: number;
        orcStrength: number;
    }) {
        const gimli = createCompanion({
            id: '0P12',
            instanceId: 'gimli-1',
            title: 'Gimli',
            strength: opts.gimliStrength,
            vitality: 3,
            wounds: 0,
            actionPhases: ['SKIRMISH'],
            abilities: [GIMLI_BOOST],
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            strength: opts.orcStrength,
            vitality: 2,
        });
        return createGameState({
            fpPlayerId: '1',
            activeSkirmishId: 'sk-gimli',
            skirmishes: [
                {
                    id: 'sk-gimli',
                    companionId: 'gimli-1',
                    minionIds: ['orc-1'],
                },
            ],
            battlefield: [orc],
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'ESCARMOUCHE',
                message: 'x',
                canPass: true,
                passesCount: 0,
            },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [gimli],
                }),
            },
        });
    }

    it('déjà gagnant : passe (pas d’affaiblir Gimli pour +2)', () => {
        const G = gimliState({ gimliStrength: 8, orcStrength: 5 });
        expect(pickSkirmishCombatAction(G, '1', 'skirmish')).toBeNull();
        expect(
            enumerateBotMoves(G, skirmishActionCtx(), '1')[0]?.move
        ).toBe('passActionWindow');
    });

    it('perdant de 1 : active +2 pour retourner le combat', () => {
        const G = gimliState({ gimliStrength: 6, orcStrength: 7 });
        expect(pickSkirmishCombatAction(G, '1', 'skirmish')).toEqual({
            move: 'activateAbility',
            args: ['gimli-1', '0P12:0'],
        });
        expect(enumerateBotMoves(G, skirmishActionCtx(), '1')[0]).toEqual({
            move: 'activateAbility',
            args: ['gimli-1', '0P12:0'],
        });
    });

    it('perdant de 3 : +2 ne suffit pas → passe', () => {
        const G = gimliState({ gimliStrength: 5, orcStrength: 8 });
        expect(pickSkirmishCombatAction(G, '1', 'skirmish')).toBeNull();
        expect(
            enumerateBotMoves(G, skirmishActionCtx(), '1')[0]?.move
        ).toBe('passActionWindow');
    });
});

describe('BOT heuristique B6 — plafond 5 compagnons', () => {
    function fellowshipCtx(): Ctx {
        return {
            numPlayers: 2,
            turn: 1,
            currentPlayer: '1',
            phase: 'fellowship',
            playOrder: ['0', '1'],
            playOrderPos: 1,
            activePlayers: { '0': 'play', '1': 'play' },
        } as Ctx;
    }

    function fiveCompanions(woundsOffRb = 0) {
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo-1',
            title: 'Frodo',
            keywords: ['RING-BEARER'],
        });
        const others = Array.from({ length: 4 }, (_, i) =>
            createCompanion({
                id: `comp-${i}`,
                instanceId: `comp-${i}`,
                title: `Comp ${i}`,
                wounds: i === 0 ? woundsOffRb : 0,
                vitality: 6,
            })
        );
        return [frodo, ...others];
    }

    it('refuse un 6ᵉ compagnon sans blessures hors Porteur', () => {
        const sixth = createCompanion({
            id: 'boromir',
            instanceId: 'boromir-1',
            title: 'Boromir',
            twilightCost: 3,
        });
        const G = createGameState({
            fpPlayerId: '1',
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [sixth],
                    fellowshipArea: fiveCompanions(0),
                }),
            },
        });
        expect(mayPlayAnotherCompanion(G)).toBe(false);
        expect(enumerateBotMoves(G, fellowshipCtx(), '1')[0]?.move).toBe(
            'endFellowshipPhase'
        );
    });

    it('autorise un 6ᵉ si ≥ 5 blessures hors Porteur', () => {
        const sixth = createCompanion({
            id: 'boromir',
            instanceId: 'boromir-1',
            title: 'Boromir',
            twilightCost: 3,
        });
        const G = createGameState({
            fpPlayerId: '1',
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [sixth],
                    fellowshipArea: fiveCompanions(5),
                }),
            },
        });
        expect(mayPlayAnotherCompanion(G)).toBe(true);
        expect(enumerateBotMoves(G, fellowshipCtx(), '1')[0]).toEqual({
            move: 'playCard',
            args: [0],
        });
    });
});

describe('BOT heuristique B7 — affectation avec boosts prévus', () => {
    it('PL : compte le +2 Gimli pour gagner un combat serré', () => {
        const gimli = createCompanion({
            id: '0P12',
            instanceId: 'gimli-1',
            title: 'Gimli',
            strength: 5,
            vitality: 3,
            wounds: 0,
            actionPhases: ['SKIRMISH'],
            abilities: [GIMLI_BOOST],
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            title: 'Aragorn',
            strength: 8,
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            strength: 6,
        });
        const G = createGameState({
            fpPlayerId: '1',
            assignmentStep: 'FP_ASSIGN',
            battlefield: [orc],
            skirmishes: [],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [aragorn, gimli],
                }),
            },
        });
        // Sans boost : Aragorn (8>6). Avec +2 Gimli : surplus 1 < surplus Aragorn 2 → Gimli.
        expect(pickAssignmentByStrength(G, true)).toEqual({
            minionId: 'orc-1',
            companionId: 'gimli-1',
        });
    });
});

describe('BOT heuristique B8 — ombre cheap + combats sûrs', () => {
    it('Ombre : joue le séide le moins cher d’abord', () => {
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 20,
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    hand: [
                        createMinion({
                            id: 'troll',
                            instanceId: 'troll-1',
                            twilightCost: 8,
                        }),
                        createMinion({
                            id: 'orc',
                            instanceId: 'orc-1',
                            twilightCost: 2,
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
                phase: 'shadow',
                playOrder: ['0', '1'],
                playOrderPos: 1,
                activePlayers: { '0': 'play', '1': 'play' },
            } as Ctx,
            '1'
        );
        expect(moves[0]).toEqual({ move: 'playShadowCard', args: [1] });
    });

    it('Escarmouche : résout d’abord un combat déjà gagné', () => {
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            strength: 8,
        });
        const merry = createCompanion({
            id: 'merry',
            instanceId: 'merry-1',
            strength: 3,
        });
        const weak = createMinion({
            id: 'orc-w',
            instanceId: 'orc-w',
            strength: 4,
        });
        const strong = createMinion({
            id: 'orc-s',
            instanceId: 'orc-s',
            strength: 9,
        });
        const G = createGameState({
            fpPlayerId: '1',
            battlefield: [weak, strong],
            skirmishes: [
                {
                    id: 'sk-lose',
                    companionId: 'merry-1',
                    minionIds: ['orc-s'],
                },
                {
                    id: 'sk-win',
                    companionId: 'aragorn-1',
                    minionIds: ['orc-w'],
                },
            ],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [merry, aragorn],
                }),
            },
        });
        expect(pickNextSkirmishId(G)).toBe('sk-win');
        expect(
            enumerateBotMoves(
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
            )[0]
        ).toEqual({ move: 'selectSkirmish', args: ['sk-win'] });
    });
});

const WOUND_SKIRMISHING: Ability = {
    id: 'wound-sk:0',
    phases: ['SKIRMISH'],
    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
    effects: [
        {
            type: 'WOUND',
            count: 1,
            target: 'SKIRMISHING',
        },
    ],
    source: 'SELF',
};

const MALUS_MINION: Ability = {
    id: 'malus:0',
    phases: ['SKIRMISH'],
    cost: [],
    effects: [
        {
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: -3,
            target: [['MINION']],
            expiresAtPhase: 'SKIRMISH',
        },
    ],
    source: 'SELF',
};

const WOUND_MANEUVER: Ability = {
    id: 'wound-man:0',
    phases: ['MANEUVER'],
    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
    effects: [
        {
            type: 'WOUND',
            count: 1,
            target: [['MINION']],
        },
    ],
    source: 'SELF',
};

describe('BOT heuristique C10 — ciblage combat', () => {
    it('blessure mortelle sur le séide pour retourner le combat', () => {
        const gimli = createCompanion({
            id: '0P12',
            instanceId: 'gimli-1',
            title: 'Gimli',
            strength: 6,
            vitality: 3,
            wounds: 0,
            actionPhases: ['SKIRMISH'],
            abilities: [WOUND_SKIRMISHING],
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            strength: 7,
            vitality: 1,
            wounds: 0,
        });
        const G = createGameState({
            fpPlayerId: '1',
            activeSkirmishId: 'sk-1',
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'gimli-1',
                    minionIds: ['orc-1'],
                },
            ],
            battlefield: [orc],
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'ESCARMOUCHE',
                message: 'x',
                canPass: true,
                passesCount: 0,
            },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [gimli],
                }),
            },
        });
        expect(pickSkirmishCombatAction(G, '1', 'skirmish')).toEqual({
            move: 'activateAbility',
            args: ['gimli-1', 'wound-sk:0', 'orc-1'],
        });
    });

    it('event malus −3 : cible le séide si ça retourne', () => {
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            strength: 7,
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            strength: 9,
        });
        const event = createCard({
            id: '1R83',
            instanceId: 'evt-1',
            type: 'EVENT',
            kind: 'FREE_PEOPLE',
            title: 'Malus',
            twilightCost: 0,
            abilities: [MALUS_MINION],
        });
        const G = createGameState({
            fpPlayerId: '1',
            activeSkirmishId: 'sk-1',
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'aragorn-1',
                    minionIds: ['orc-1'],
                },
            ],
            battlefield: [orc],
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'ESCARMOUCHE',
                message: 'x',
                canPass: true,
                passesCount: 0,
            },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [aragorn],
                    hand: [event],
                }),
            },
        });
        expect(pickSkirmishCombatAction(G, '1', 'skirmish')).toEqual({
            move: 'playCard',
            args: [0, 'orc-1'],
        });
    });

    it('blessure non mortelle : passe (ne retourne pas)', () => {
        const gimli = createCompanion({
            id: '0P12',
            instanceId: 'gimli-1',
            strength: 6,
            vitality: 3,
            actionPhases: ['SKIRMISH'],
            abilities: [WOUND_SKIRMISHING],
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            strength: 7,
            vitality: 3,
            wounds: 0,
        });
        const G = createGameState({
            fpPlayerId: '1',
            activeSkirmishId: 'sk-1',
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'gimli-1',
                    minionIds: ['orc-1'],
                },
            ],
            battlefield: [orc],
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'ESCARMOUCHE',
                message: 'x',
                canPass: true,
                passesCount: 0,
            },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [gimli],
                }),
            },
        });
        expect(pickSkirmishCombatAction(G, '1', 'skirmish')).toBeNull();
    });
});

describe('BOT heuristique C9 light — manœuvre greedy', () => {
    it('tue un séide à 1 vitalité en manœuvre', () => {
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            strength: 8,
            vitality: 4,
            actionPhases: ['MANEUVER'],
            abilities: [WOUND_MANEUVER],
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            strength: 5,
            vitality: 1,
        });
        const G = createGameState({
            fpPlayerId: '1',
            battlefield: [orc],
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'MANOEUVRE',
                message: 'x',
                canPass: true,
                passesCount: 0,
            },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [aragorn],
                }),
            },
        });
        expect(pickGreedyPhaseWoundAction(G, '1', 'maneuver')).toEqual({
            move: 'activateAbility',
            args: ['aragorn-1', 'wound-man:0', 'orc-1'],
        });
        expect(
            enumerateBotMoves(
                G,
                {
                    numPlayers: 2,
                    turn: 1,
                    currentPlayer: '1',
                    phase: 'maneuver',
                    playOrder: ['0', '1'],
                    playOrderPos: 1,
                    activePlayers: { '0': 'play', '1': 'play' },
                } as Ctx,
                '1'
            )[0]
        ).toEqual({
            move: 'activateAbility',
            args: ['aragorn-1', 'wound-man:0', 'orc-1'],
        });
    });

    it('ne blesse pas un séide encore trop vivant', () => {
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn-1',
            vitality: 4,
            actionPhases: ['MANEUVER'],
            abilities: [WOUND_MANEUVER],
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc-1',
            vitality: 3,
        });
        const G = createGameState({
            fpPlayerId: '1',
            battlefield: [orc],
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                title: 'MANOEUVRE',
                message: 'x',
                canPass: true,
                passesCount: 0,
            },
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    fellowshipArea: [aragorn],
                }),
            },
        });
        expect(pickGreedyPhaseWoundAction(G, '1', 'maneuver')).toBeNull();
        expect(
            enumerateBotMoves(
                G,
                {
                    numPlayers: 2,
                    turn: 1,
                    currentPlayer: '1',
                    phase: 'maneuver',
                    playOrder: ['0', '1'],
                    playOrderPos: 1,
                    activePlayers: { '0': 'play', '1': 'play' },
                } as Ctx,
                '1'
            )[0]?.move
        ).toBe('passActionWindow');
    });
});
