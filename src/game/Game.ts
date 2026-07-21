// src/game/Game.ts
import type { Game } from 'boardgame.io';
import type { GameState, CardType, PlayerState } from './types';
import { FREE_PEOPLES_DATABASE, SHADOW_DATABASE } from './cardsData';

const shuffle = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const createRealLotrDeck = (): CardType[] => {
    const fullPool: CardType[] = [];
    for (let i = 0; i < 15; i++) {
        const fpCard = FREE_PEOPLES_DATABASE[i % FREE_PEOPLES_DATABASE.length];
        const shCard = SHADOW_DATABASE[i % SHADOW_DATABASE.length];

        fullPool.push({ ...fpCard, id: `${fpCard.id}-${i}` });
        fullPool.push({ ...shCard, id: `${shCard.id}-${i}` });
    }
    return shuffle(fullPool);
};

const createInitialPlayer = (): PlayerState => ({
    deck: createRealLotrDeck(),
    hand: [],
    discard: [],
    freePeoplesArea: [],
    supportArea: [],
});

// 🛠️ MOVES COMMUNS / GLOBAUX DISPONIBLES EN TOUT TEMPS
const commonMoves = {
    drawCard: ({ G, ctx, playerID }: any) => {
    console.log('--- TRY DRAW CARD ---');
    console.log('playerID qui clique:', playerID);
    console.log('ctx.currentPlayer:', ctx.currentPlayer);
    console.log('ctx.activePlayers:', ctx.activePlayers);

    const targetId = playerID || ctx.currentPlayer;
    const player = G.players[targetId];
    if (player?.deck && player.deck.length > 0) {
        const card = player.deck.shift();
        if (card) player.hand.push(card);
    }
},

    reorderFellowship: (
        { G }: any,
        {
            fromIndex,
            toIndex,
        }: { fromIndex: number; toIndex: number }
    ) => {
        const player = G.players['0'];
        if (!player || !player.freePeoplesArea) return;

        // Sécurité sur les bornes
        if (
            fromIndex < 0 ||
            fromIndex >= player.freePeoplesArea.length ||
            toIndex < 0 ||
            toIndex >= player.freePeoplesArea.length ||
            fromIndex === toIndex
        ) {
            return;
        }

        // Réordonnancement dans le tableau
        const [movedCard] = player.freePeoplesArea.splice(fromIndex, 1);
        player.freePeoplesArea.splice(toIndex, 0, movedCard);
    },
};

export const LotrGame: Game<GameState> = {
    setup: (): GameState => ({
        twilightPool: 0,
        currentSite: 1,
        battlefield: [],
        players: {
            '0': createInitialPlayer(),
            '1': createInitialPlayer(),
        },
    }),

    // 💡 On retire le bloc turn global qui entrait en conflit avec les phases !

    phases: {
        // 1. FELLOWSHIP PHASE (Joueur FP '0')
        fellowship: {
            start: true,
            next: 'shadow',
            turn: {
                activePlayers: { value: { '0': 'play' } }, // 👈 Syntaxe officielle boardgame.io
            },
            moves: {
                ...commonMoves,
                playCard: ({ G, ctx }, cardIndex: number) => {
                    // ... ton code playCard ...
                },
                attachCard: ({ G, ctx }, cardIndex: number, targetCardId: string) => {
                    // ... ton code attachCard ...
                },
                endFellowshipPhase: ({ events }) => {
                    events.endPhase();
                },
            },
        },

        // 2. SHADOW PHASE (Joueur Ombre '1')
        shadow: {
            turn: {
                activePlayers: { value: { '1': 'play' } },
            },
            next: ({ G }) => {
                const hasMinions = G.battlefield.some((c) => c.kind === 'SHADOW');
                return hasMinions ? 'maneuver' : 'regroup';
            },
            moves: {
                ...commonMoves,
                playShadowCard: ({ G, ctx }, cardIndex: number) => {
                    // ... ton code playShadowCard ...
                },
                endShadowPhase: ({ events }) => {
                    events.endPhase();
                },
            },
        },

        // 3. MANEUVER PHASE
        maneuver: {
            next: 'archery',
            turn: {
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            moves: {
                ...commonMoves,
                endManeuverPhase: ({ events }) => events.endPhase(),
            },
        },

        // 4. ARCHERY PHASE
        archery: {
            next: 'assignment',
            turn: {
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            moves: {
                ...commonMoves,
                endArcheryPhase: ({ events }) => events.endPhase(),
            },
        },

        // 5. ASSIGNMENT PHASE (Retour FP '0')
        assignment: {
            turn: {
                activePlayers: { value: { '0': 'play' } },
            },
            next: 'skirmish',
            moves: {
                ...commonMoves,
                endAssignmentPhase: ({ events }) => events.endPhase(),
            },
        },

        // 6. SKIRMISH PHASE
        skirmish: {
            next: 'regroup',
            turn: {
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            moves: {
                ...commonMoves,
                endSkirmishPhase: ({ events }) => events.endPhase(),
            },
        },

        // 7. REGROUP PHASE (FP '0')
        regroup: {
            turn: {
                activePlayers: { value: { '0': 'play' } },
            },
            moves: {
                ...commonMoves,
                moveNextSite: ({ G, events }) => {
                    if (G.currentSite < 9) G.currentSite += 1;
                    events.setPhase('shadow');
                },
                endTurn: ({ events }) => {
                    events.endTurn();
                },
            },
        },
    },
};