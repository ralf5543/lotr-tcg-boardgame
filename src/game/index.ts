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
});

export const LotrGame: Game<GameState> = {
    setup: (): GameState => ({
        twilightPool: 0,
        currentSiteIndex: 0,
        movesThisTurn: 0,
        statusMessage: 'Phase de Communauté : préparez vos compagnons.',
        awaitingSiteSelection: false,
        skirmishes: [],
        activeSkirmishId: undefined,
        actionWindow: undefined,
        assignmentStep: 'FP_ASSIGN',
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
                deadPile: [],
            },
            '1': {
                ...createInitialPlayer('1'),
                sitesDeck: DUMMY_SITES_PLAYER_0.slice(1),
                currentSiteIndex: 0,
                deadPile: [],
            },
        },
    }),

    events: {
        endPhase: true,
        setPhase: true,
        endTurn: true,
        setActivePlayers: true,
    },

    phases: {
        fellowship: {
            start: true,
            next: 'shadow',
            turn: {
                activePlayers: { value: { '0': 'play', '1': 'play' } },
            },
            moves: {
                ...commonMoves,
                playCard: (
                    { G, ctx, playerID }: LotrMoveContext,
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

                    G.twilightPool += Number(card.twilightCost) || 0;
                },

                attachCard: (
                    { G, ctx, playerID }: LotrMoveContext,
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
                    if (!targetCard.attachments) targetCard.attachments = [];
                    targetCard.attachments.push(attachmentCard);

                    G.twilightPool += Number(attachmentCard.twilightCost) || 0;
                },

                endFellowshipPhase: ({
                    G,
                    ctx,
                    playerID,
                    events,
                }: LotrMoveContext) => {
                    advanceCompany(G, ctx, playerID, events);
                },
            },
        },

        shadow: {
            turn: {
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
                    { G, ctx, playerID }: LotrMoveContext,
                    cardIndex: number
                ) => {
                    const targetId = getTargetPlayerId(playerID, ctx);
                    const player = G.players?.[targetId];
                    if (!player || !player.hand) return;

                    const card = player.hand[cardIndex];
                    if (!card || card.kind !== 'SHADOW') return;

                    const p0SiteIndex = G.players['0'].currentSiteIndex;
                    const effectiveCost = getEffectiveTwilightCost(
                        card,
                        p0SiteIndex
                    );

                    if (G.twilightPool < effectiveCost) return 'INVALID_MOVE';

                    player.hand.splice(cardIndex, 1);
                    G.twilightPool -= effectiveCost;

                    if (card.type === 'MINION') {
                        G.battlefield.push(card);
                    } else {
                        player.supportArea.push(card);
                    }

                    const wasRoaming = isMinionRoaming(card, p0SiteIndex);
                    G.statusMessage = `L'Ombre joue ${card.name} (${effectiveCost} Crépuscule${wasRoaming ? ' dont +2 Errance' : ''}).`;
                },

                attachShadowCard: (
                    { G, ctx, playerID }: LotrMoveContext,
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

                    if (!targetMinion.attachments)
                        targetMinion.attachments = [];
                    targetMinion.attachments.push(attachmentCard);

                    G.statusMessage = `L'Ombre attache ${attachmentCard.name} à ${targetMinion.name}.`;
                },

                endShadowPhase: ({ events }: LotrMoveContext) => {
                    events?.endPhase?.();
                },
            },
        },

        maneuver: {
            next: 'archery',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                endManeuverPhase: ({ events }: LotrMoveContext) =>
                    events?.endPhase?.(),
            },
        },

        archery: {
            next: 'assignment',
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                endArcheryPhase: ({ events }: LotrMoveContext) =>
                    events?.endPhase?.(),
            },
        },

        assignment: {
            next: 'skirmish',
            turn: { activePlayers: { value: { '0': 'play' } } },
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
                    const isFP = playerID === '0';
                    const isShadow = playerID === '1';

                    // 1. Vérifications de tour/rôle
                    if (G.assignmentStep === 'FP_ASSIGN' && !isFP)
                        return 'INVALID_MOVE';
                    if (G.assignmentStep === 'SHADOW_ASSIGN' && !isShadow)
                        return 'INVALID_MOVE';

                    // 2. Vérification de validité de la cible AVANT toute mutation
                    const compCard = G.players['0']?.fellowshipArea.find(
                        (c) => c.id === companionId
                    );
                    if (!compCard) return 'INVALID_MOVE'; // Si la cible n'existe pas, on stoppe net !

                    const existingSkirmish = G.skirmishes.find(
                        (s) => s.companionId === companionId
                    );

                    // 3. Vérification de la règle de surcharge FP AVANT de retirer le séide
                    if (
                        G.assignmentStep === 'FP_ASSIGN' &&
                        existingSkirmish &&
                        existingSkirmish.minionIds.length >= 1 &&
                        !existingSkirmish.minionIds.includes(minionId) // Si le séide n'était pas déjà sur ce compagnon
                    ) {
                        return 'INVALID_MOVE'; // 🛑 On stoppe SANS avoir modifié G.skirmishes !
                    }

                    // 🟢 4. Une fois toutes les vérifications validées, ON PEUT MUTATIONNER :

                    // Retirer le séide de son ancienne escarmouche s'il en avait une
                    G.skirmishes.forEach((s) => {
                        s.minionIds = s.minionIds.filter(
                            (id) => id !== minionId
                        );
                    });

                    // Ajouter au compagnon cible
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

                    // Nettoyer les escarmouches vides
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
                    if (ctx.phase !== 'skirmish' || playerID !== '0')
                        return 'INVALID_MOVE';

                    const skirmish = G.skirmishes.find(
                        (s) => s.id === skirmishId
                    );
                    if (!skirmish) return 'INVALID_MOVE';

                    G.activeSkirmishId = skirmishId;
                    G.actionWindow = {
                        isOpen: true,
                        activePlayerId: '0',
                        title: 'ESCARMOUCHE',
                        message:
                            'Phase d’actions de Skirmish : Jouez des cartes/effets ou PASSER.',
                        canPass: true,
                        passesCount: 0,
                    };
                },

                resolveActiveSkirmish: ({
                    G,
                    ctx,
                    events,
                }: LotrMoveContext) => {
                    if (!G.activeSkirmishId) return 'INVALID_MOVE';
                    resolveSkirmish(G, ctx, events);
                },

                endSkirmishPhase: ({ events }: LotrMoveContext) =>
                    events?.endPhase?.(),
            },
        },

        regroup: {
            turn: { activePlayers: { value: { '0': 'play', '1': 'play' } } },
            moves: {
                ...commonMoves,
                moveNextSite: ({
                    G,
                    ctx,
                    playerID,
                    events,
                }: LotrMoveContext) => {
                    advanceCompany(G, ctx, playerID, events);
                },
                endTurn: ({ events }: LotrMoveContext) => {
                    events?.endTurn?.();
                },
            },
        },
    },
};
