// src/game/Game.ts
import type { Game } from 'boardgame.io';
import type { GameState, CardType, PlayerState } from './types';
import {
    FREE_PEOPLES_DATABASE,
    SHADOW_DATABASE,
    DUMMY_SITES_PLAYER_0,
} from './cardsData';

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
    sitesDeck: [],
    currentSiteIndex: 0,
});

const getTargetPlayerId = (playerID: any, ctx: any): string => {
    if (playerID !== undefined && playerID !== null && playerID !== '') {
        return String(playerID);
    }
    return String(ctx.currentPlayer ?? '0');
};

// Logique centralisée de déplacement
export const advanceCompany = (
    G: GameState,
    ctx: any,
    playerID: any,
    events: any
) => {
    const p0 = G.players['0'];
    const nextIndex = p0.currentSiteIndex + 1;

    if (nextIndex >= 9) return; // Fin du chemin atteint

    // CAS A : Le site existe déjà ! On avance directement.
    if (G.path[nextIndex] !== null) {
        p0.currentSiteIndex = nextIndex;
        G.statusMessage = `La compagnie avance au site ${nextIndex + 1} : ${G.path[nextIndex].name}`;
        events.endPhase(); // Passe à la Shadow phase
    }
    // CAS B : Case vide ! On donne la main au joueur Ombre ('1') pour poser le site.
    else {
        G.awaitingSiteSelection = true;
        G.statusMessage =
            "En attente du joueur de l'Ombre pour poser le prochain site...";

        // 🔑 ON DONNE LE CONTRÔLE AU JOUEUR OMBRE '1'
        events.setActivePlayers({ value: { '1': 'play' } });
    }
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
        payload: {
            fromIndex?: number;
            toIndex?: number;
            oldIndex?: number;
            newIndex?: number;
        }
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

    // 🔑 PLAY SITE DISPONIBLE EN MOVE COMMUN
    playSite: (
        { G, ctx, playerID, events }: any,
        siteId: string,
        targetIndex: number
    ) => {
        const player = G.players[playerID];
        if (!player || !player.sitesDeck) return 'INVALID_MOVE';

        const siteIndex = player.sitesDeck.findIndex(
            (s: any) => s.id === siteId
        );
        if (siteIndex === -1) return 'INVALID_MOVE';

        const nextEmptyIndex = G.path.findIndex((slot: any) => slot === null);
        if (targetIndex !== nextEmptyIndex) return 'INVALID_MOVE';

        // 1. Placer le site sur le chemin
        const [playedSite] = player.sitesDeck.splice(siteIndex, 1);
        playedSite.ownerId = playerID;
        G.path[targetIndex] = playedSite;

        // 2. Si on était en attente d'un déplacement
        if (G.awaitingSiteSelection) {
            G.awaitingSiteSelection = false;
            G.players['0'].currentSiteIndex = targetIndex;
            G.statusMessage = `Nouveau site révélé ! La compagnie avance en ${playedSite.name}.`;

            // On ferme la phase Fellowship et on démarre la Shadow Phase
            events.endPhase();
        }
    },
};

export const LotrGame: Game<GameState> = {
    setup: (): GameState => ({
        twilightPool: 0,
        currentSiteIndex: 0,
        movesThisTurn: 0,
        statusMessage: 'Phase de Communauté : préparez vos compagnons.',
        awaitingSiteSelection: false,
        path: [
            DUMMY_SITES_PLAYER_0[0], // Site 1
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
        ],
        battlefield: [],
        players: {
            '0': {
                ...createInitialPlayer(),
                sitesDeck: DUMMY_SITES_PLAYER_0.slice(1),
                currentSiteIndex: 0,
            },
            '1': {
                ...createInitialPlayer(),
                sitesDeck: DUMMY_SITES_PLAYER_0.slice(1),
                currentSiteIndex: 0,
            },
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

                    player.hand.splice(cardIndex, 1);

                    if (card.subType === 'COMPANION') {
                        player.fellowshipArea.push(card);
                    } else {
                        player.supportArea.push(card);
                    }

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
                        player.fellowshipArea.find(
                            (c: any) => c.id === targetCardId
                        ) ||
                        player.supportArea.find(
                            (c: any) => c.id === targetCardId
                        );

                    if (!targetCard) return;

                    player.hand.splice(cardIndex, 1);

                    if (!targetCard.attachments) {
                        targetCard.attachments = [];
                    }
                    targetCard.attachments.push(attachmentCard);

                    const cost = Number(attachmentCard.twilightCost) || 0;
                    G.twilightPool += cost;
                },

                endFellowshipPhase: ({ G, ctx, playerID, events }: any) => {
                    advanceCompany(G, ctx, playerID, events);
                },
            },
        },

        // 2. SHADOW PHASE (Joueur Ombre '1')
        shadow: {
            turn: {
                activePlayers: { value: { '1': 'play' } },
            },
            next: ({ G }: any) => {
                const hasMinions = G.battlefield.some(
                    (c: any) => c.kind === 'SHADOW'
                );
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

        // Autres phases...
        maneuver: {
            next: 'archery',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                endManeuverPhase: ({ events }: any) => events.endPhase(),
            },
        },
        archery: {
            next: 'assignment',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                endArcheryPhase: ({ events }: any) => events.endPhase(),
            },
        },
        assignment: {
            next: 'skirmish',
            turn: { activePlayers: { value: { '0': 'play' } } },
            moves: {
                ...commonMoves,
                endAssignmentPhase: ({ events }: any) => events.endPhase(),
            },
        },
        skirmish: {
            next: 'regroup',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                endSkirmishPhase: ({ events }: any) => events.endPhase(),
            },
        },
        regroup: {
            turn: { activePlayers: { value: { '0': 'play' } } },
            moves: {
                ...commonMoves,
                moveNextSite: ({ G, ctx, playerID, events }: any) => {
                    advanceCompany(G, ctx, playerID, events);
                },
                endTurn: ({ events }: any) => {
                    events.endTurn();
                },
            },
        },
    },
};
