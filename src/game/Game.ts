import type { Game, Ctx } from 'boardgame.io';
import type { GameState, CardState, PlayerState } from './types';
import { CARDS_DATABASE, DUMMY_SITES_PLAYER_0 } from './cardsData';

interface MoveContext {
    G: GameState;
    ctx: Ctx;
    playerID: string;
    events: {
        endPhase: () => void;
        setActivePlayers: (config: { value: Record<string, string> }) => void;
        endTurn: () => void;
    };
}

const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const createRealLotrDeck = (playerId: string): CardState[] => {
    const fullPool: CardState[] = [];
    for (let i = 0; i < 15; i++) {
        const Card = CARDS_DATABASE[i % CARDS_DATABASE.length];
        fullPool.push({ ...Card, id: `p${playerId}-${Card.id}-${i}-${Math.random().toString(36).substring(2, 7)}` });
    }
    return shuffle(fullPool);
};

const createInitialPlayer = (playerId: string): PlayerState => ({
    deck: createRealLotrDeck(playerId),
    hand: [],
    discard: [],
    fellowshipArea: [],
    supportArea: [],
    sitesDeck: [],
    currentSiteIndex: 0,
});

const getTargetPlayerId = (playerID: string | undefined, ctx: Ctx): string => {
    if (playerID !== undefined && playerID !== null && playerID !== '') {
        return String(playerID);
    }
    return String(ctx.currentPlayer ?? '0');
};

export const advanceCompany = (
    G: GameState,
    ctx: Ctx,
    playerID: string,
    events: MoveContext['events']
) => {
    const p0 = G.players['0'];
    const nextIndex = p0.currentSiteIndex + 1;

    if (nextIndex >= 9) return; // Limite du chemin atteinte

    // Helper pour calculer et ajouter le Crépuscule du nouveau site
    const applyTwilightForSite = (siteIndex: number) => {
        const targetSite = G.path[siteIndex];
        if (!targetSite) return;

        // 1. Coût du site (supporte twilightCost ou twilight)
        const siteCost =
            Number(targetSite.twilightCost ?? (targetSite as any).twilight) ||
            0;

        // 2. Nombre de compagnons sur le plateau
        const companionsCount = p0.fellowshipArea
            ? p0.fellowshipArea.length
            : 0;

        const totalAdded = siteCost + companionsCount;

        // 3. Ajout au Twilight Pool
        G.twilightPool += totalAdded;

        console.log(
            `[Twilight Calculation] Site cost: ${siteCost} + Companions: ${companionsCount} = +${totalAdded} Crépuscule (Total: ${G.twilightPool})`
        );
    };

    // CAS A : Le site existe déjà sur le chemin ! On avance directement.
    if (G.path[nextIndex] !== null) {
        p0.currentSiteIndex = nextIndex;
        applyTwilightForSite(nextIndex); // 🟢 Calcul automatique du Crépuscule

        G.statusMessage = `La compagnie avance au site ${nextIndex + 1} : ${G.path[nextIndex]?.name}`;
        events.endPhase(); // Passe à la Shadow phase
    }
    // CAS B : Case vide ! On demande au joueur Ombre de poser son site.
    else {
        G.awaitingSiteSelection = true;
        G.statusMessage =
            "En attente du joueur de l'Ombre pour poser le prochain site...";

        events.setActivePlayers({ value: { '1': 'play' } });
    }
};

// 🛠️ MOVES COMMUNS
const commonMoves = {
    // 🟢 La pioche s'adresse au joueur qui clique (playerID)
    drawCard: ({ G, ctx, playerID }: MoveContext) => {
        console.log('[drawCard] Called by playerID:', playerID);
        console.log('[drawCard] Current player in ctx:', ctx.currentPlayer);
        console.log('[drawCard] Active players in ctx:', ctx.activePlayers);
        console.log('[drawCard] Current phase:', ctx.phase);

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
        { G, ctx, playerID }: MoveContext,
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

    playSite: (
        { G, playerID, events }: MoveContext,
        siteId: string,
        targetIndex: number
    ) => {
        const player = G.players[playerID];
        if (!player || !player.sitesDeck) return 'INVALID_MOVE';

        const siteIndex = player.sitesDeck.findIndex((s) => s.id === siteId);
        if (siteIndex === -1) return 'INVALID_MOVE';

        const nextEmptyIndex = G.path.findIndex((slot) => slot === null);
        if (targetIndex !== nextEmptyIndex) return 'INVALID_MOVE';

        const [playedSite] = player.sitesDeck.splice(siteIndex, 1);
        playedSite.ownerId = playerID;
        G.path[targetIndex] = playedSite;

        if (G.awaitingSiteSelection) {
            G.awaitingSiteSelection = false;
            const p0 = G.players['0'];
            p0.currentSiteIndex = targetIndex;

            // 🟢 Calcul du Crépuscule au moment où le site est posé & révélé !
            const siteCost =
                Number(
                    playedSite.twilightCost ?? (playedSite as any).twilight
                ) || 0;
            const companionsCount = p0.fellowshipArea
                ? p0.fellowshipArea.length
                : 0;
            G.twilightPool += siteCost + companionsCount;

            G.statusMessage = `Nouveau site révélé ! La compagnie avance en ${playedSite.name}. (+${siteCost + companionsCount} Crépuscule)`;
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
            DUMMY_SITES_PLAYER_0[0],
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
                ...createInitialPlayer('0'),
                sitesDeck: DUMMY_SITES_PLAYER_0.slice(1),
                currentSiteIndex: 0,
            },
            '1': {
                ...createInitialPlayer('1'),
                sitesDeck: DUMMY_SITES_PLAYER_0.slice(1),
                currentSiteIndex: 0,
            },
        },
    }),

    phases: {
        // 1. FELLOWSHIP PHASE
        fellowship: {
            start: true,
            next: 'shadow',
            turn: {
                // 🟢 On autorise les 2 joueurs à agir pour permettre la pioche/mouvements de test
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            moves: {
                ...commonMoves,
                playCard: (
                    { G, ctx, playerID }: MoveContext,
                    cardIndex: number
                ) => {
                    const targetId = getTargetPlayerId(playerID, ctx);
                    const player = G.players?.[targetId];

                    if (!player || !player.hand) return;

                    const card = player.hand[cardIndex];
                    if (!card || card.kind !== 'FREE_PEOPLES') return;

                    player.hand.splice(cardIndex, 1);

                    if (card.type === 'COMPANION') {
                        player.fellowshipArea.push(card);
                    } else {
                        player.supportArea.push(card);
                    }

                    const cost = Number(card.twilightCost) || 0;
                    G.twilightPool += cost;
                },

                attachCard: (
                    { G, ctx, playerID }: MoveContext,
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
                            (c) => c.id === targetCardId
                        ) ||
                        player.supportArea.find((c) => c.id === targetCardId);

                    if (!targetCard) return;

                    player.hand.splice(cardIndex, 1);

                    if (!targetCard.attachments) {
                        targetCard.attachments = [];
                    }
                    targetCard.attachments.push(attachmentCard);

                    const cost = Number(attachmentCard.twilightCost) || 0;
                    G.twilightPool += cost;
                },

                endFellowshipPhase: ({
                    G,
                    ctx,
                    playerID,
                    events,
                }: MoveContext) => {
                    advanceCompany(G, ctx, playerID, events);
                },
            },
        },

        // 2. SHADOW PHASE
        shadow: {
            turn: {
                // 🟢 Même chose ici : les deux joueurs sont autorisés
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            next: ({ G }: { G: GameState }) => {
                const hasMinions = G.battlefield.some(
                    (c) => c.kind === 'SHADOW'
                );
                return hasMinions ? 'maneuver' : 'regroup';
            },
            moves: {
                ...commonMoves,

                playShadowCard: (
                    { G, ctx, playerID }: MoveContext,
                    cardIndex: number
                ) => {
                    const targetId = getTargetPlayerId(playerID, ctx);
                    const player = G.players?.[targetId];

                    if (!player || !player.hand) return;

                    const card = player.hand[cardIndex];
                    if (!card || card.kind !== 'SHADOW') return;

                    const cost = Number(card.twilightCost) || 0;

                    if (G.twilightPool < cost) return 'INVALID_MOVE';

                    player.hand.splice(cardIndex, 1);
                    G.twilightPool -= cost;

                    if (card.type === 'MINION') {
                        G.battlefield.push(card);
                    } else {
                        player.supportArea.push(card);
                    }

                    G.statusMessage = `L'Ombre joue ${card.name} (${cost} Crépuscule).`;
                },

                attachShadowCard: (
                    { G, ctx, playerID }: MoveContext,
                    cardIndex: number,
                    targetMinionId: string
                ) => {
                    const targetId = getTargetPlayerId(playerID, ctx);
                    const player = G.players?.[targetId];
                    if (!player || !player.hand) return;

                    const attachmentCard = player.hand[cardIndex];
                    if (!attachmentCard || attachmentCard.kind !== 'SHADOW')
                        return;

                    const targetMinion = G.battlefield.find(
                        (c) => c.id === targetMinionId
                    );
                    if (!targetMinion) return;

                    const cost = Number(attachmentCard.twilightCost) || 0;
                    if (G.twilightPool < cost) return 'INVALID_MOVE';

                    player.hand.splice(cardIndex, 1);
                    G.twilightPool -= cost;

                    if (!targetMinion.attachments) {
                        targetMinion.attachments = [];
                    }
                    targetMinion.attachments.push(attachmentCard);

                    G.statusMessage = `L'Ombre attache ${attachmentCard.name} à ${targetMinion.name}.`;
                },

                endShadowPhase: ({ events }: MoveContext) => {
                    events.endPhase();
                },
            },
        },

        maneuver: {
            next: 'archery',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                endManeuverPhase: ({ events }: MoveContext) =>
                    events.endPhase(),
            },
        },
        archery: {
            next: 'assignment',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                endArcheryPhase: ({ events }: MoveContext) => events.endPhase(),
            },
        },
        assignment: {
            next: 'skirmish',
            turn: { activePlayers: { value: { '0': 'play' } } },
            moves: {
                ...commonMoves,
                endAssignmentPhase: ({ events }: MoveContext) =>
                    events.endPhase(),
            },
        },
        skirmish: {
            next: 'regroup',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                endSkirmishPhase: ({ events }: MoveContext) =>
                    events.endPhase(),
            },
        },
        regroup: {
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                moveNextSite: ({ G, ctx, playerID, events }: MoveContext) => {
                    advanceCompany(G, ctx, playerID, events);
                },
                endTurn: ({ events }: MoveContext) => {
                    events.endTurn();
                },
            },
        },
    },
};
