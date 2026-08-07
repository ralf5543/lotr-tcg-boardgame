import type { Game } from 'boardgame.io';
import type {
    GameState,
    CardState,
    PlayerState,
    LotrPhaseContext,
    LotrMoveContext,
} from './types';
import { CARDS_DATABASE, DUMMY_SITES_PLAYER_0 } from './cardsData';
import {
    isMinionRoaming,
    getEffectiveTwilightCost,
} from '../utils/roamingDetection';
import { resolveSkirmish } from './skirmish';
import { checkAssignmentProgress, getUnassignedMinions } from './assignment';
import { commonMoves, advanceCompany, getTargetPlayerId } from './moves';

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
        fullPool.push({
            ...Card,
            id: `p${playerId}-${Card.id}-${i}-${Math.random().toString(36).substring(2, 7)}`,
            isFaceDown: false,
        });
    }
    return shuffle(fullPool);
};

const createInitialPlayer = (playerId: string): PlayerState => ({
    profile:
        playerId === '0'
            ? {
                  name: 'Raphaël',
                  avatar: 'avatars/avatar_p0.webp',
                  faction: 'freePeoples',
              }
            : {
                  name: 'Tom',
                  avatar: 'avatars/avatar_p1.webp',
                  faction: 'shadow',
              },
    deck: createRealLotrDeck(playerId),
    hand: [],
    discard: [],
    deadPile: [],
    fellowshipArea: [],
    supportArea: [],
    sitesDeck: [],
    currentSiteIndex: 0,
    burdens: 0,
});

export const setupGame = (): GameState => {
    const players: Record<string, PlayerState> = {
        '0': {
            ...createInitialPlayer('0'),
            sitesDeck: DUMMY_SITES_PLAYER_0.slice(1),
            currentSiteIndex: 0,
            deadPile: [],
            burdens: 0,
        },
        '1': {
            ...createInitialPlayer('1'),
            sitesDeck: DUMMY_SITES_PLAYER_0.slice(1),
            currentSiteIndex: 0,
            deadPile: [],
            burdens: 0,
        },
    };

    // Préparation automatique du début de partie pour chaque joueur
    Object.keys(players).forEach((pId) => {
        const player = players[pId];
        if (!player || !player.deck) return;

        // 1. Recherche du Porteur de l'Anneau (Keyword: RING-BEARER)
        const ringBearerIndex = player.deck.findIndex((c) =>
            c.keywords?.includes('RING-BEARER')
        );

        let ringBearer: CardState | undefined;
        if (ringBearerIndex !== -1) {
            [ringBearer] = player.deck.splice(ringBearerIndex, 1);
        }

        // 2. Recherche de L'Anneau Unique (Keyword: THE-ONE-RING)
        const theOneRingIndex = player.deck.findIndex((c) =>
            c.keywords?.includes('THE-ONE-RING')
        );

        let theOneRing: CardState | undefined;
        if (theOneRingIndex !== -1) {
            [theOneRing] = player.deck.splice(theOneRingIndex, 1);
        }

        // Attachement de l'Anneau au Porteur s'ils existent
        if (ringBearer) {
            if (theOneRing) {
                ringBearer.attachments = [theOneRing];
            }
            ringBearer.isFaceDown = false;
            player.fellowshipArea = [ringBearer];
        } else {
            player.fellowshipArea = [];
        }

        // 3. Extraction des Compagnons de départ (isStartingMember = true)
        const startingMembers: CardState[] = [];
        player.deck = player.deck.filter((card) => {
            if (card.isStartingMember && card.type === 'COMPANION') {
                startingMembers.push({ ...card, isFaceDown: true });
                return false;
            }
            return true;
        });

        player.fellowshipArea.push(...startingMembers);
        player.deck = shuffle(player.deck);
    });

    return {
        fpPlayerId: '0',
        twilightPool: 0,
        currentSiteIndex: 0,
        movesThisTurn: 0,
        statusMessage: 'Phase de mise en place : Misez vos fardeaux.',
        awaitingSiteSelection: false,
        skirmishes: [],
        activeSkirmishId: undefined,
        actionWindow: undefined,
        assignmentStep: 'FP_ASSIGN',
        path: [null, null, null, null, null, null, null, null, null],
        battlefield: [],
        players,
        burdens: 0,
        fellowshipCardsDrawn: 0,

        // État de la mise en place
        setupState: {
            bids: { '0': null, '1': null },
            mulligans: { '0': null, '1': null },
            step: 'BIDDING',
            auctionWinnerId: undefined,
        },
    };
};

export const LotrGame: Game<GameState> = {
    setup: setupGame,

    events: {
        endPhase: true,
        setPhase: true,
        endTurn: true,
        setActivePlayers: true,
    },

    phases: {
        // PHASE SETUP : ENCHÈRES & MULLIGAN
        setup: {
            start: true,
            next: 'fellowship',
            turn: {
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            moves: {
                ...commonMoves,
                reorderFellowship: commonMoves.reorderFellowship,

                // 1. Soumettre sa mise via le BiddingWidget
                submitBid: (
                    { G, playerID }: LotrMoveContext,
                    bidAmount: number
                ) => {
                    if (!G.setupState || G.setupState.step !== 'BIDDING')
                        return 'INVALID_MOVE';

                    // 🟢 S'assurer que playerID est bien défini et convertir en string
                    const pId = String(playerID ?? '0');

                    const validBid = Math.max(
                        0,
                        Math.min(10, Math.floor(bidAmount))
                    );

                    // 🟢 On enregistre bien la mise dans setupState
                    if (!G.setupState.bids) G.setupState.bids = {};
                    G.setupState.bids[pId] = validBid;

                    // 🟢 Affectation directe des fardeaux au PlayerState du joueur concerné
                    if (G.players && G.players[pId]) {
                        G.players[pId].burdens = validBid;
                    }

                    const bid0 = G.setupState.bids['0'];
                    const bid1 = G.setupState.bids['1'];

                    // Quand les deux joueurs ont soumis leur mise
                    if (
                        bid0 !== null &&
                        bid0 !== undefined &&
                        bid1 !== null &&
                        bid1 !== undefined
                    ) {
                        if (bid0 > bid1) {
                            G.setupState.auctionWinnerId = '0';
                        } else if (bid1 > bid0) {
                            G.setupState.auctionWinnerId = '1';
                        } else {
                            G.setupState.auctionWinnerId =
                                Math.random() < 0.5 ? '0' : '1';
                        }

                        G.setupState.step = 'CHOOSING_FIRST';
                        G.statusMessage = `Mises : Joueur 0 (${bid0}) - Joueur 1 (${bid1}). Le Joueur ${G.setupState.auctionWinnerId} gagne l'enchère.`;
                    } else {
                        G.statusMessage = `Joueur ${pId} a misé ${validBid} fardeau(x). En attente de l'adversaire...`;
                    }
                },

                // 2. Choix du premier joueur par le gagnant
                chooseFirstPlayer: (
                    { G }: LotrMoveContext,
                    wantToBeFirst: boolean
                ) => {               if (!G.setupState || G.setupState.step !== 'CHOOSING_FIRST')
                        return 'INVALID_MOVE';

                    const winnerId = G.setupState.auctionWinnerId || '0';
                    const otherId = winnerId === '0' ? '1' : '0';

                    // Le joueur qui choisit d'être premier devient les Peuples Libres (FP)
                    G.fpPlayerId = wantToBeFirst ? winnerId : otherId;

                    // 🟢 Chantiers / fardeaux : Chaque joueur conserve sa propre mise déjà enregistrée dans `G.players[id].burdens`.
                    const fpBurdens = G.players[G.fpPlayerId]?.burdens ?? 0;

                    G.setupState.step = 'AWAITING_SITE';
                    G.awaitingSiteSelection = true;
                    G.statusMessage = `Le Joueur ${G.fpPlayerId} est les Peuples Libres et commence avec ${fpBurdens} fardeau(x) ! Posez le site 1.`;
                },

                // 3. Choix du site de départ
                selectStartingSite: (
                    { G }: LotrMoveContext,
                    siteCard: CardState
                ) => {
                    if (!G.setupState || G.setupState.step !== 'AWAITING_SITE')
                        return 'INVALID_MOVE';

                    G.path[0] = siteCard;
                    G.awaitingSiteSelection = false;

                    // Révélation des compagnons et pioche de 8 cartes
                    Object.values(G.players).forEach((p) => {
                        p.fellowshipArea.forEach((c) => {
                            c.isFaceDown = false;
                        });

                        const cardsToDraw = p.deck.splice(0, 8);
                        p.hand.push(...cardsToDraw);
                    });

                    G.setupState.step = 'MULLIGAN';
                    G.statusMessage =
                        'Site 1 posé et Compagnies révélées ! Choisissez de garder votre main ou de faire un Mulligan.';
                },

                // 4. Validation du Mulligan
                submitMulliganChoice: (
                    { G, events, playerID }: LotrMoveContext,
                    doMulligan: boolean
                ) => {
                    if (!G.setupState || G.setupState.step !== 'MULLIGAN')
                        return 'INVALID_MOVE';
                    const pId = playerID ?? '0';
                    const player = G.players[pId];
                    if (!player) return 'INVALID_MOVE';

                    G.setupState.mulligans[pId] = doMulligan;

                    if (doMulligan) {
                        player.deck.push(...player.hand);
                        player.hand = [];
                        player.deck = shuffle(player.deck);
                        player.hand = player.deck.splice(0, 8);
                    }

                    const m0 = G.setupState.mulligans['0'];
                    const m1 = G.setupState.mulligans['1'];

                    if (m0 !== null && m1 !== null) {
                        G.setupState.step = 'COMPLETE';
                        G.statusMessage =
                            'Mise en place terminée ! Début de la partie.';
                        events?.setPhase?.('fellowship');
                    }
                },
            },
        },

        fellowship: {
            next: 'shadow',
            turn: {
                order: {
                    first: ({ G }) => Number(G.fpPlayerId || '0'),
                    next: ({ G }) => Number(G.fpPlayerId || '0'),
                },
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            onBegin: ({ G }: LotrPhaseContext) => {
                G.movesThisTurn = 0;
                G.fellowshipCardsDrawn = 0;
                G.regroupStep = undefined;
                G.statusMessage =
                    'Phase de Communauté : Jouez vos compagnons et soutiens.';
            },
            moves: {
                ...commonMoves,
            },
        },

        shadow: {
            turn: {
                order: {
                    first: ({ G }) => Number(G.fpPlayerId === '0' ? '1' : '0'),
                    next: ({ G }) => Number(G.fpPlayerId === '0' ? '1' : '0'),
                },
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },

            next: 'maneuver',

            onBegin: ({ G, ctx }: LotrPhaseContext) => {

                G.actionWindow = undefined;

                const shadowId = G.fpPlayerId === '0' ? '1' : '0';
                G.statusMessage = `Phase d'Ombre : Joueur Ombre (${shadowId}), jouez vos Séides/Soutiens. Crépuscule disponible : ${G.twilightPool}`;
            },
            onEnd: () => {
                console.log('🛑 [LOG PHASE] SHADOW: onEnd');
            },

            moves: {
                ...commonMoves,

                playShadowCard: (
                    { G, ctx, playerID }: LotrMoveContext,
                    cardIndex: number
                ) => {
                    const shadowId = G.fpPlayerId === '0' ? '1' : '0';
                    if (playerID !== shadowId) return 'INVALID_MOVE';

                    const targetId = getTargetPlayerId(playerID, ctx);
                    const player = G.players?.[targetId];
                    if (!player || !player.hand) return;

                    const card = player.hand[cardIndex];
                    if (!card || card.kind !== 'SHADOW') return;

                    const fpId = G.fpPlayerId || '0';
                    const fpSiteIndex = G.players[fpId]?.currentSiteIndex || 0;
                    const effectiveCost = getEffectiveTwilightCost(
                        card,
                        fpSiteIndex
                    );

                    if (G.twilightPool < effectiveCost) return 'INVALID_MOVE';

                    player.hand.splice(cardIndex, 1);
                    G.twilightPool -= effectiveCost;

                    if (card.type === 'MINION') {
                        G.battlefield.push(card);
                    } else {
                        player.supportArea.push(card);
                    }

                    const wasRoaming = isMinionRoaming(card, fpSiteIndex);
                    G.statusMessage = `L'Ombre joue ${card.name} (${effectiveCost} Crépuscule${wasRoaming ? ' dont +2 Errance' : ''}).`;
                },

                attachShadowCard: (
                    { G, ctx, playerID }: LotrMoveContext,
                    cardIndex: number,
                    targetMinionId: string
                ) => {
                    const shadowId = G.fpPlayerId === '0' ? '1' : '0';
                    if (playerID !== shadowId) return 'INVALID_MOVE';

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

                    if (!targetMinion.attachments)
                        targetMinion.attachments = [];
                    targetMinion.attachments.push(attachmentCard);

                    G.statusMessage = `L'Ombre attache ${attachmentCard.name} à ${targetMinion.name}.`;
                },

                endShadowPhase: ({ G, events, playerID }: LotrMoveContext) => {

                    const shadowId = G.fpPlayerId === '0' ? '1' : '0';
                    if (playerID !== shadowId) return 'INVALID_MOVE';

                    const hasMinions = G.battlefield.some(
                        (c) => c.kind === 'SHADOW' && c.type === 'MINION'
                    );

                    if (hasMinions) {
                        events?.setPhase?.('maneuver');
                    } else {
                        events?.setPhase?.('regroup');
                    }
                },
            },
        },

        maneuver: {
            next: 'archery',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            onBegin: ({ G }: LotrPhaseContext) => {
                const fpId = G.fpPlayerId || '0';
                G.actionWindow = {
                    isOpen: true,
                    activePlayerId: fpId,
                    title: 'PHASE DE MANŒUVRE',
                    message:
                        'Voulez-vous jouer une carte / un effet de Manœuvre ou PASSER ?',
                    canPass: true,
                    passesCount: 0,
                };
                G.statusMessage =
                    'Phase de Manœuvre : Fenêtre d’action ouverte.';
            },
            moves: {
                ...commonMoves,
            },
        },

        archery: {
            next: 'assignment',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            onBegin: ({ G }: LotrPhaseContext) => {
                const fpId = G.fpPlayerId || '0';
                G.actionWindow = {
                    isOpen: true,
                    activePlayerId: fpId,
                    title: 'PHASE D’ARCHERIE',
                    message:
                        'Voulez-vous jouer une carte / un effet d’Archerie ou PASSER ?',
                    canPass: true,
                    passesCount: 0,
                };
                G.statusMessage =
                    'Phase d’Archerie : Fenêtre d’action ouverte.';
            },
            moves: {
                ...commonMoves,
            },
        },

        assignment: {
            next: 'skirmish',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            onBegin: ({ G }: LotrPhaseContext) => {
                G.skirmishes = [];
                const unassignedMinions = getUnassignedMinions(G);

                if (unassignedMinions.length === 0) {
                    G.assignmentStep = 'COMPLETED';
                    G.statusMessage =
                        'Aucun séide en jeu : pas d’affectation nécessaire.';
                } else {
                    G.assignmentStep = 'FP_ASSIGN';
                    G.statusMessage =
                        'Phase d’Affectation : Le joueur des Peuples Libres attribue les séides aux compagnons.';
                }
            },
            moves: {
                ...commonMoves,

                assignMinion: (
                    { G, ctx, playerID, events }: LotrMoveContext,
                    minionId: string,
                    companionId: string
                ) => {
                    const fpId = G.fpPlayerId || '0';
                    const isFP = playerID === fpId;
                    const isShadow = playerID !== fpId;

                    if (G.assignmentStep === 'FP_ASSIGN' && !isFP)
                        return 'INVALID_MOVE';
                    if (G.assignmentStep === 'SHADOW_ASSIGN' && !isShadow)
                        return 'INVALID_MOVE';

                    const compCard = G.players[fpId]?.fellowshipArea.find(
                        (c) => c.id === companionId
                    );
                    if (!compCard) return 'INVALID_MOVE';

                    const existingSkirmish = G.skirmishes.find(
                        (s) => s.companionId === companionId
                    );

                    if (
                        G.assignmentStep === 'FP_ASSIGN' &&
                        existingSkirmish &&
                        existingSkirmish.minionIds.length >= 1 &&
                        !existingSkirmish.minionIds.includes(minionId)
                    ) {
                        return 'INVALID_MOVE';
                    }

                    G.skirmishes.forEach((s) => {
                        s.minionIds = s.minionIds.filter(
                            (id) => id !== minionId
                        );
                    });

                    if (existingSkirmish) {
                        if (!existingSkirmish.minionIds.includes(minionId)) {
                            existingSkirmish.minionIds.push(minionId);
                        }
                    } else {
                        G.skirmishes.push({
                            id: `skirmish_${companionId}`,
                            companionId,
                            minionIds: [minionId],
                        });
                    }

                    G.skirmishes = G.skirmishes.filter(
                        (s) => s.minionIds.length > 0
                    );

                    const minionCard = G.battlefield.find(
                        (c) => c.id === minionId
                    );
                    G.statusMessage = `${minionCard?.name || 'Le séide'} est affecté à ${compCard.name}.`;

                    checkAssignmentProgress(G, ctx, events);
                },

                endAssignmentPhase: ({ events }: LotrMoveContext) =>
                    events?.endPhase?.(),
            },
        },

        skirmish: {
            next: 'regroup',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },

            moves: {
                ...commonMoves,

                selectSkirmish: (
                    { G, ctx, playerID }: LotrMoveContext,
                    skirmishId: string
                ) => {
                    const fpId = G.fpPlayerId || '0';
                    if (ctx.phase !== 'skirmish' || playerID !== fpId)
                        return 'INVALID_MOVE';

                    const skirmish = G.skirmishes.find(
                        (s) => s.id === skirmishId
                    );
                    if (!skirmish) return 'INVALID_MOVE';

                    G.activeSkirmishId = skirmishId;
                    G.actionWindow = {
                        isOpen: true,
                        activePlayerId: fpId,
                        title: 'ESCARMOUCHE',
                        message:
                            'Phase d’actions de Skirmish : Jouez des cartes/effets ou PASSER.',
                        canPass: true,
                        passesCount: 0,
                    };
                },

                resolveActiveSkirmish: ({ G, ctx }: LotrMoveContext) => {
                    if (!G.activeSkirmishId) return 'INVALID_MOVE';
                    resolveSkirmish(G, ctx);
                },

                endSkirmishPhase: ({ events }: LotrMoveContext) =>
                    events?.endPhase?.(),
            },
        },

        regroup: {
            next: 'fellowship',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },

            onBegin: ({ G }: LotrPhaseContext) => {
                const fpId = G.fpPlayerId || '0';
                if ((G.movesThisTurn || 0) >= 2) {
                    G.regroupStep = 'SHADOW_REFILL';
                    G.statusMessage =
                        "Limite de déplacement atteinte (2/2). Reconstitution de la main de l'Ombre.";
                } else {
                    G.regroupStep = 'SHADOW_REFILL';
                    G.statusMessage =
                        'Phase de Regroupement : L’Ombre ajuste sa main.';
                }

                G.actionWindow = {
                    isOpen: true,
                    activePlayerId: fpId,
                    title: 'PHASE DE REGROUPEMENT',
                    message:
                        'Voulez-vous jouer une carte / un effet de Regroupement ou PASSER ?',
                    canPass: true,
                    passesCount: 0,
                };
            },

            moves: {
                ...commonMoves,

                moveNextSite: ({
                    G,
                    ctx,
                    events,
                    playerID,
                }: LotrMoveContext) => {
                    const fpId = G.fpPlayerId || '0';

                    if (
                        playerID !== fpId ||
                        (G.movesThisTurn || 0) >= 2 ||
                        G.regroupStep !== 'FP_DECISION'
                    ) {
                        return 'INVALID_MOVE';
                    }

                    advanceCompany(G, ctx);

                    if (!G.awaitingSiteSelection) {
                        G.skirmishes = [];
                        G.activeSkirmishId = undefined;
                        events?.setPhase?.('shadow');
                    }
                },
            },
        },
    },
};
