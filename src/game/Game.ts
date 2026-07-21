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

    turn: {
        activePlayers: { currentPlayer: '0' },
    },

    phases: {
        // 1. FELLOWSHIP PHASE (Le joueur FP a la main)
        fellowship: {
            start: true,
            next: 'shadow',
            turn: {
                activePlayers: { currentPlayer: '0' },
            },
            moves: {
                drawCard: ({ G, ctx }) => {
                    const player = G.players[ctx.currentPlayer];
                    if (player?.deck && player.deck.length > 0) {
                        const card = player.deck.shift();
                        if (card) player.hand.push(card);
                    }
                },
                playCard: ({ G, ctx }, cardIndex: number) => {
                    const player = G.players[ctx.currentPlayer];
                    const card = player?.hand?.[cardIndex];
                    if (!card) return;

                    if (card.kind !== 'FREE_PEOPLES') {
                        console.log("Impossible de jouer des cartes Ombre en phase de Communauté.");
                        return;
                    }

                    player.hand.splice(cardIndex, 1);

                    if (card.subType === 'COMPANION') {
                        player.freePeoplesArea.push(card);
                    } else {
                        player.supportArea.push(card);
                    }

                    G.twilightPool += card.twilightCost;
                },
                attachCard: ({ G, ctx }, cardIndex: number, targetCardId: string) => {
                    const player = G.players[ctx.currentPlayer];
                    const attachmentCard = player?.hand?.[cardIndex];
                    if (!attachmentCard) return;

                    const targetCard =
                        player.freePeoplesArea?.find((c) => c.id === targetCardId) ||
                        player.supportArea?.find((c) => c.id === targetCardId);

                    if (!targetCard) return;

                    player.hand.splice(cardIndex, 1);
                    if (!targetCard.attachments) targetCard.attachments = [];
                    targetCard.attachments.push(attachmentCard);

                    if (attachmentCard.kind === 'FREE_PEOPLES') {
                        G.twilightPool += attachmentCard.twilightCost;
                    }
                },
                endFellowshipPhase: ({ events }) => {
                    events.endPhase();
                },
            },
        },

        // 2. SHADOW PHASE (On donne automatiquement la main au joueur Ombre '1')
        shadow: {
            turn: {
                activePlayers: { value: { '1': 'play' } },
            },
            next: ({ G }) => {
                const hasMinions = G.battlefield.some((c) => c.kind === 'SHADOW');
                return hasMinions ? 'maneuver' : 'regroup';
            },
            moves: {
                playShadowCard: ({ G, ctx }, cardIndex: number) => {
                    const player = G.players[ctx.currentPlayer];
                    const card = player?.hand?.[cardIndex];
                    if (!card || card.kind !== 'SHADOW') return;

                    if (G.twilightPool < card.twilightCost) {
                        console.log("Pas assez de Crépuscule dans le bassin !");
                        return;
                    }

                    player.hand.splice(cardIndex, 1);
                    G.battlefield.push(card);
                    G.twilightPool = Math.max(0, G.twilightPool - card.twilightCost);
                },
                endShadowPhase: ({ events }) => {
                    events.endPhase();
                },
            },
        },

        // 3. MANEUVER PHASE
        maneuver: {
            next: 'archery',
            moves: {
                endManeuverPhase: ({ events }) => events.endPhase(),
            },
        },

        // 4. ARCHERY PHASE
        archery: {
            next: 'assignment',
            moves: {
                endArcheryPhase: ({ events }) => events.endPhase(),
            },
        },

        // 5. ASSIGNMENT PHASE (Retour de la main au FP '0')
        assignment: {
            turn: {
                activePlayers: { value: { '0': 'play' } },
            },
            next: 'skirmish',
            moves: {
                endAssignmentPhase: ({ events }) => events.endPhase(),
            },
        },

        // 6. SKIRMISH PHASE
        skirmish: {
            next: 'regroup',
            moves: {
                endSkirmishPhase: ({ events }) => events.endPhase(),
            },
        },

        // 7. REGROUP PHASE (Main au FP '0')
        regroup: {
            turn: {
                activePlayers: { value: { '0': 'play' } },
            },
            moves: {
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