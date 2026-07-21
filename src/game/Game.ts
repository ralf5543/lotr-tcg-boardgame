// src/game/Game.ts
import type { Game } from 'boardgame.io';
import type { GameState, CardType, PlayerState } from './types';
import { FREE_PEOPLES_DATABASE, SHADOW_DATABASE } from './cardsData';

const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
    fellowshipArea: [],
    supportArea: [],
});

const getTargetPlayerId = (playerID: any, ctx: any): string => {
    if (playerID !== undefined && playerID !== null && playerID !== '') {
        return String(playerID);
    }
    return String(ctx.currentPlayer ?? '0');
};

// 🛠️ MOVES COMMUNS DISPONIBLES EN TOUT TEMPS
const commonMoves = {
    drawCard: ({ G, ctx, playerID }: any) => {
        const targetId = getTargetPlayerId(playerID, ctx);
        const player = G.players[targetId];

        if (player?.deck && player.deck.length > 0) {
            const card = player.deck.shift();
            if (card) {
                player.hand.push(card);
            }
        }
    },

    reorderFellowship: (
        { G, ctx, playerID }: any,
        payload: { fromIndex?: number; toIndex?: number; oldIndex?: number; newIndex?: number }
    ) => {
        const targetId = getTargetPlayerId(playerID, ctx);
        const fromIndex = payload?.fromIndex ?? payload?.oldIndex;
        const toIndex = payload?.toIndex ?? payload?.newIndex;

        const player = G.players?.[targetId];
        if (!player || !Array.isArray(player.fellowshipArea)) return;

        const list = player.fellowshipArea;

        if (
            typeof fromIndex !== 'number' ||
            typeof toIndex !== 'number' ||
            fromIndex < 0 ||
            fromIndex >= list.length ||
            toIndex < 0 ||
            toIndex >= list.length ||
            fromIndex === toIndex
        ) {
            return;
        }

        const [movedCard] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, movedCard);
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

    phases: {
        // 1. FELLOWSHIP PHASE (Joueur FP '0')
        fellowship: {
            start: true,
            next: 'shadow',
            turn: {
                activePlayers: { value: { '0': 'play' } },
            },
            moves: {
                ...commonMoves,
                playCard: ({ G, ctx, playerID }: any, cardIndex: number) => {
                    const targetId = getTargetPlayerId(playerID, ctx);
                    const player = G.players?.[targetId];

                    if (!player || !player.hand) return;

                    const card = player.hand[cardIndex];
                    if (!card || card.kind !== 'FREE_PEOPLES') return;

                    // 1. Retrait de la main
                    player.hand.splice(cardIndex, 1);

                    // 2. Déploiement dans la zone appropriée
                    if (card.subType === 'COMPANION') {
                        player.fellowshipArea.push(card);
                    } else {
                        player.supportArea.push(card);
                    }

                    // 3. Coût Twilight
                    const cost = Number(card.twilightCost) || 0;
                    G.twilightPool += cost;
                },

                attachCard: (
                    { G, ctx, playerID }: any,
                    cardIndex: number,
                    targetCardId: string
                ) => {
                    const targetId = getTargetPlayerId(playerID, ctx);
                    const player = G.players?.[targetId];
                    if (!player || !player.hand) return;

                    const attachmentCard = player.hand[cardIndex];
                    if (!attachmentCard) return;

                    const targetCard =
                        player.fellowshipArea.find((c: any) => c.id === targetCardId) ||
                        player.supportArea.find((c: any) => c.id === targetCardId);

                    if (!targetCard) return;

                    player.hand.splice(cardIndex, 1);

                    if (!targetCard.attachments) {
                        targetCard.attachments = [];
                    }
                    targetCard.attachments.push(attachmentCard);

                    const cost = Number(attachmentCard.twilightCost) || 0;
                    G.twilightPool += cost;
                },

                endFellowshipPhase: ({ events }: any) => {
                    events.endPhase();
                },
            },
        },

        // 2. SHADOW PHASE (Joueur Ombre '1')
        shadow: {
            turn: {
                activePlayers: { value: { '1': 'play' } },
            },
            next: ({ G }: any) => {
                const hasMinions = G.battlefield.some((c: any) => c.kind === 'SHADOW');
                return hasMinions ? 'maneuver' : 'regroup';
            },
            moves: {
                ...commonMoves,
                playShadowCard: ({ G, ctx }: any, cardIndex: number) => {},
                endShadowPhase: ({ events }: any) => {
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
                endManeuverPhase: ({ events }: any) => events.endPhase(),
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
                endArcheryPhase: ({ events }: any) => events.endPhase(),
            },
        },

        // 5. ASSIGNMENT PHASE
        assignment: {
            next: 'skirmish',
            turn: {
                activePlayers: { value: { '0': 'play' } },
            },
            moves: {
                ...commonMoves,
                endAssignmentPhase: ({ events }: any) => events.endPhase(),
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
                endSkirmishPhase: ({ events }: any) => events.endPhase(),
            },
        },

        // 7. REGROUP PHASE
        regroup: {
            turn: {
                activePlayers: { value: { '0': 'play' } },
            },
            moves: {
                ...commonMoves,
                moveNextSite: ({ G, events }: any) => {
                    if (G.currentSite < 9) G.currentSite += 1;
                    events.setPhase('shadow');
                },
                endTurn: ({ events }: any) => {
                    events.endTurn();
                },
            },
        },
    },
};