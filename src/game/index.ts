import type { Game } from 'boardgame.io';
import type {
    GameState,
    CardState,
    PlayerState,
    LotrPhaseContext,
    LotrMoveContext,
} from './types';
import { CARDS_DATABASE, DUMMY_SITES_PLAYER_0 } from './cardsData';
import { loadAndValidateDeck } from '../utils/deckLoader';
import {
    isMinionRoaming,
    getEffectiveTwilightCost,
} from '../utils/roamingDetection';
import { resolveSkirmish } from './logic/skirmish';
import { getUnassignedMinions } from './logic/assignment';
import { commonMoves, advanceCompany, getTargetPlayerId } from './moves';
import { devMoves } from './dev/devMoves';
import { drawCardsForPlayer } from '../utils/drawCards';
import { buildDeckFromIds } from '../utils/deckBuilder';
import { allMoves } from './moves/index';

const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const createCardInstance = (
    cardId: string,
    playerId: string,
    suffix: string
): CardState => {
    const baseCard = CARDS_DATABASE.find((c) => c.id === cardId);
    if (!baseCard) {
        throw new Error(
            `Carte introuvable dans CARDS_DATABASE pour l'ID : ${cardId}`
        );
    }
    return {
        ...baseCard,
        id: `p${playerId}-${baseCard.id}-${suffix}`,
        isFaceDown: false,
    };
};

const createInitialPlayer = (playerId: string): PlayerState => {
    const isP0 = playerId === '0';
    const deckConfig = loadAndValidateDeck(playerId);
    const fullDeckIds = [...deckConfig.freePeople, ...deckConfig.shadow];

    return {
        profile: isP0
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
        deck: buildDeckFromIds(fullDeckIds, playerId),
        hand: [],
        discard: [],
        deadPile: [],
        fellowshipArea: [],
        supportArea: [],
        sitesDeck: [],
        currentSiteIndex: 0,
        burdens: 0,
    };
};

/**
 * Compte le nombre d'occurrences du mot-clé 'ARCHER' sur le personnage uniquement.
 */
const countCardArcheryKeywords = (card: CardState): number => {
    if (!card.keywords || !Array.isArray(card.keywords)) return 0;
    return card.keywords.filter((kw) => kw.toUpperCase() === 'ARCHER').length;
};

/**
 * Calcul total de la réserve d'archerie pour les FP et pour l'Ombre
 */
export const calculateArcheryTotals = (G: GameState) => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];

    // 1. Archerie des Peuples Libres (Uniquement les compagnons dans la fellowshipArea du joueur FP)
    let fpTotal = 0;
    if (fpPlayer && fpPlayer.fellowshipArea) {
        fpPlayer.fellowshipArea.forEach((companion) => {
            fpTotal += countCardArcheryKeywords(companion);
        });
    }

    // 2. Archerie de l'Ombre (Les séides sur le battlefield)
    let shadowTotal = 0;
    if (G.battlefield) {
        G.battlefield.forEach((minion) => {
            if (minion.kind === 'SHADOW' && minion.type === 'MINION') {
                shadowTotal += countCardArcheryKeywords(minion);
            }
        });
    }

    return { fpTotal, shadowTotal };
};

/**
 * Avance ou termine la sous-phase d'assignation des blessures d'archerie
 */
export const advanceArcheryAssignmentStep = (G: GameState, events: any) => {
    if (!G.archeryState) return;

    const shadowId = G.fpPlayerId === '0' ? '1' : '0';

    // 1. Passage de la phase d'actions au calcul / FP_ASSIGN
    if (G.archeryState.step === 'ACTIONS') {
        const { fpTotal, shadowTotal } = calculateArcheryTotals(G);
        G.archeryState.fpTotal = fpTotal;
        G.archeryState.shadowTotal = shadowTotal;

        // Les FP subissent le total Shadow, l'Ombre subit le total FP
        G.archeryState.fpRemainingWounds = shadowTotal;
        G.archeryState.shadowRemainingWounds = fpTotal;

        // Fermer la fenêtre d'action
        G.actionWindow = undefined;

        if (G.archeryState.fpRemainingWounds > 0) {
            G.archeryState.step = 'FP_ASSIGN';
            G.statusMessage = `Phase d'Archerie : Le joueur des Peuples Libres doit attribuer ${G.archeryState.fpRemainingWounds} blessure(s) d'archerie à ses compagnons.`;
            return;
        }
        // Si les FP n'ont pas de blessures à subir, on passe directement à l'Ombre
        G.archeryState.step = 'SHADOW_ASSIGN';
    }

    // 2. Passage aux blessures de l'Ombre
    if (
        G.archeryState.step === 'SHADOW_ASSIGN' ||
        G.archeryState.fpRemainingWounds <= 0
    ) {
        G.archeryState.step = 'SHADOW_ASSIGN';

        if (
            G.archeryState.shadowRemainingWounds > 0 &&
            G.battlefield.length > 0
        ) {
            G.statusMessage = `Phase d'Archerie : Le joueur de l'Ombre (${shadowId}) doit attribuer ${G.archeryState.shadowRemainingWounds} blessure(s) d'archerie à ses séides.`;
            return;
        }
    }

    // 3. Fin de la phase d'archerie si toutes les blessures sont attribuées
    G.archeryState = undefined;
    G.actionWindow = undefined;

    // Vérification s'il reste des séides vivants sur le battlefield
    const remainingMinions = G.battlefield.filter(
        (c) => c.kind === 'SHADOW' && c.type === 'MINION'
    );

    if (remainingMinions.length === 0) {
        G.statusMessage =
            "Plus aucun séide en jeu après l'archerie : passage direct au Regroupement.";
        events?.setPhase?.('regroup');
    } else {
        G.statusMessage =
            "Phase d'Archerie terminée : Début de la phase de Manœuvre.";
        events?.setPhase?.('assignment');
    }
};

export const setupGame = ({ random }: { random: any }): GameState => {
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

    Object.keys(players).forEach((pId) => {
        const player = players[pId];
        if (!player || !player.deck) return;

        const deckConfig = loadAndValidateDeck(pId);

        const ringBearer = createCardInstance(
            deckConfig.ringBearerId,
            pId,
            'ringbearer'
        );
        const oneRing = createCardInstance(
            deckConfig.oneRingId,
            pId,
            'onering'
        );

        if (!ringBearer.keywords) ringBearer.keywords = [];
        if (!ringBearer.keywords.includes('RING-BEARER')) {
            ringBearer.keywords.push('RING-BEARER');
        }

        ringBearer.attachments = [oneRing];
        player.fellowshipArea = [ringBearer];

        deckConfig.startingCompanionIds.forEach((cardId, index) => {
            const companion = createCardInstance(
                cardId,
                pId,
                `starting-comp-${index}`
            );
            companion.isFaceDown = true;
            player.fellowshipArea.push(companion);
        });

        player.deck = random.Shuffle(player.deck);
    });

    const G: GameState = {
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
        fellowshipCardsDrawn: 0,

        mulliganChoices: {
            '0': null,
            '1': null,
        },

        setupState: {
            bids: { '0': null, '1': null },
            mulligans: { '0': null, '1': null },
            step: 'BIDDING',
            auctionWinnerId: undefined,
        },
    };

    return G;
};

export const LotrGame: Game<GameState> = {
    setup: setupGame,

    events: {
        endPhase: true,
        setPhase: true,
        endTurn: true,
        setActivePlayers: true,
    },

    // 1. MOVES GLOBAUX : Disponibles dans TOUTES les phases du jeu
    moves: {
        ...devMoves,
        ...allMoves,
        ...commonMoves,
    },

    phases: {
        setup: {
            start: true,
            next: 'fellowship',
            turn: {
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            moves: {
                ...commonMoves,

                submitBid: (
                    { G, playerID }: LotrMoveContext,
                    bidAmount: number
                ) => {
                    if (!G.setupState || G.setupState.step !== 'BIDDING')
                        return 'INVALID_MOVE';

                    const pId = String(playerID ?? '0');

                    const validBid = Math.max(
                        0,
                        Math.min(10, Math.floor(bidAmount))
                    );

                    if (!G.setupState.bids) G.setupState.bids = {};
                    G.setupState.bids[pId] = validBid;

                    if (G.players && G.players[pId]) {
                        G.players[pId].burdens = validBid;
                    }

                    const bid0 = G.setupState.bids['0'];
                    const bid1 = G.setupState.bids['1'];

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

                chooseFirstPlayer: (
                    { G, playerID }: LotrMoveContext,
                    wantToBeFirst: boolean
                ) => {
                    if (!G.setupState || G.setupState.step !== 'CHOOSING_FIRST')
                        return 'INVALID_MOVE';

                    const winnerId = G.setupState.auctionWinnerId || '0';

                    if (playerID !== winnerId) return 'INVALID_MOVE';

                    const otherId = winnerId === '0' ? '1' : '0';

                    G.fpPlayerId = wantToBeFirst ? winnerId : otherId;

                    const fpBurdens = G.players[G.fpPlayerId]?.burdens ?? 0;

                    G.setupState.step = 'AWAITING_SITE';
                    G.awaitingSiteSelection = true;
                    G.statusMessage = `Le Joueur ${G.fpPlayerId} est les Peuples Libres et commence avec ${fpBurdens} fardeau(x) ! Posez le site 1.`;
                },

                selectStartingSite: (
                    { G, playerID }: LotrMoveContext,
                    siteCard: CardState
                ) => {
                    if (
                        !G.setupState ||
                        G.setupState.step !== 'AWAITING_SITE'
                    ) {
                        return 'INVALID_MOVE';
                    }

                    if (playerID !== G.fpPlayerId) {
                        return 'INVALID_MOVE';
                    }

                    G.path[0] = siteCard;
                    G.awaitingSiteSelection = false;

                    Object.values(G.players).forEach((p) => {
                        p?.fellowshipArea?.forEach((card) => {
                            card.isFaceDown = false;
                        });
                    });

                    Object.values(G.players).forEach((player) => {
                        if (player) {
                            drawCardsForPlayer(G, player, 8, false);
                        }
                    });

                    G.setupState.step = 'MULLIGAN';
                    G.statusMessage =
                        'Site 1 posé et Compagnies révélées ! Choisissez de garder votre main ou de faire un Mulligan.';
                },

                submitMulliganChoice: (
                    { G, events, playerID }: LotrMoveContext,
                    doMulligan: boolean
                ) => {
                    if (!G.setupState || G.setupState.step !== 'MULLIGAN') {
                        return 'INVALID_MOVE';
                    }

                    const pId = String(playerID ?? '0');
                    const player = G.players[pId];
                    if (!player) return 'INVALID_MOVE';

                    if (G.setupState.mulligans[pId] !== null) {
                        return 'INVALID_MOVE';
                    }

                    G.setupState.mulligans[pId] = doMulligan;

                    if (doMulligan) {
                        player.deck.push(...player.hand);
                        player.hand = [];
                        player.deck = shuffle(player.deck);
                        drawCardsForPlayer(G, player, 8, false);
                    }

                    const m0 = G.setupState.mulligans['0'];
                    const m1 = G.setupState.mulligans['1'];

                    if (m0 !== null && m1 !== null) {
                        G.setupState.step = 'COMPLETE';
                        G.statusMessage =
                            'Mise en place terminée ! Début de la partie.';
                        events?.setPhase?.('fellowship');
                    } else {
                        G.statusMessage = `Le joueur ${pId} a validé son choix. En attente de l'adversaire...`;
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
                ...allMoves,
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

            onBegin: ({ G }: LotrPhaseContext) => {
                G.actionWindow = undefined;

                const shadowId = G.fpPlayerId === '0' ? '1' : '0';
                G.statusMessage = `Phase d'Ombre : Joueur Ombre (${shadowId}), jouez vos Séides/Soutiens. Crépuscule disponible : ${G.twilightPool}`;
            },

            moves: {
                ...allMoves,

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
            moves: allMoves,
        },

        archery: {
            next: 'assignment',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            onBegin: ({ G }: LotrPhaseContext) => {
                const fpId = G.fpPlayerId || '0';
                G.archeryState = {
                    step: 'ACTIONS',
                    fpTotal: 0,
                    shadowTotal: 0,
                    fpRemainingWounds: 0,
                    shadowRemainingWounds: 0,
                };

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
            onEnd: ({ G }) => {
                const fpId = G.fpPlayerId || '0';
                const shadowId = fpId === '0' ? '1' : '0';

                const fpPlayer = G.players[fpId];
                if (fpPlayer && fpPlayer.fellowshipArea) {
                    fpPlayer.fellowshipArea = fpPlayer.fellowshipArea.filter(
                        (c: any) => {
                            const maxVit = Number(c.vitality) || 1;
                            const dead = c.isDead || (c.wounds || 0) >= maxVit;

                            if (dead) {
                                if (!fpPlayer.deadPile) fpPlayer.deadPile = [];
                                fpPlayer.deadPile.push(c);
                            }
                            return !dead;
                        }
                    );
                }

                G.battlefield = (G.battlefield || []).filter((c: any) => {
                    const maxVit = Number(c.vitality) || 1;
                    const dead = c.isDead || (c.wounds || 0) >= maxVit;

                    if (dead) {
                        const shadowPlayer = G.players[shadowId];
                        if (shadowPlayer) {
                            if (!shadowPlayer.discard)
                                shadowPlayer.discard = [];
                            shadowPlayer.discard.push(c);
                        }
                    }
                    return !dead;
                });

                G.pendingDeadCardIds = [];
            },
            moves: allMoves,
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
                ...allMoves,

                endAssignmentPhase: ({ events }: LotrMoveContext) =>
                    events?.endPhase?.(),
            },
        },

        skirmish: {
            next: 'regroup',
            endIf: ({ G }) => {
                const noSkirmishesLeft = G.skirmishes.length === 0;
                const noActiveSkirmish = !G.activeSkirmishId;
                const noPendingAnims =
                    (!G.lastWoundedCardIds ||
                        G.lastWoundedCardIds.length === 0) &&
                    (!G.pendingDeadCardIds ||
                        G.pendingDeadCardIds.length === 0);

                return noSkirmishesLeft && noActiveSkirmish && noPendingAnims;
            },
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },

            moves: {
                ...allMoves,

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

                clearSkirmishAnimation: ({ G }: LotrMoveContext) => {
                    if (G.activeSkirmishId) {
                        const idx = G.skirmishes.findIndex(
                            (s) => s.id === G.activeSkirmishId
                        );
                        if (idx !== -1) {
                            G.skirmishes.splice(idx, 1);
                        }
                        G.activeSkirmishId = undefined;
                    }

                    G.lastWoundedCardIds = [];
                    G.pendingDeadCardIds = [];
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
                ...allMoves,

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
