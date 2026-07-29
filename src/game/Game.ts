import type { Game, Ctx, EventsAPI } from 'boardgame.io';
import type {
    GameState,
    CardState,
    PlayerState,
    SkirmishState,
    LotrPhaseContext,
    LotrMoveContext,
} from './types';
import { CARDS_DATABASE, DUMMY_SITES_PLAYER_0 } from './cardsData';
import {
    isMinionRoaming,
    getEffectiveTwilightCost,
} from '../utils/roamingDetection';

// Typage strict de l'API Events étendue pour boardgame.io
export interface LotrEventsAPI extends EventsAPI {
    setPhase?: (phase: string) => void;
    endPhase?: () => void;
    setActivePlayers?: (config: { value: Record<string, string> }) => void;
    endTurn?: () => void;
}

// Interfaces pour les payloads de moves complexes
interface ReorderPayload {
    fromIndex?: number;
    toIndex?: number;
    oldIndex?: number;
    newIndex?: number;
}

interface TransferPayload {
    attachmentId: string;
    fromCharacterId?: string;
    toCharacterId: string;
}

type DevPresetType = 'ARCHERY_TEST' | 'SKIRMISH_TEST';

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

// --- FONCTIONS UTILITAIRES POUR L'AFFECTATION ---

const getUnassignedMinions = (G: GameState): CardState[] => {
    const assignedMinionIds = (G.skirmishes || []).flatMap((s) => s.minionIds);
    return (G.battlefield || []).filter(
        (c) => c.kind === 'SHADOW' && !assignedMinionIds.includes(c.id)
    );
};

const checkAssignmentProgress = (
    G: GameState,
    _ctx: Ctx,
    events?: LotrEventsAPI
) => {
    const unassignedMinions = getUnassignedMinions(G);
    const companions = G.players['0']?.fellowshipArea || [];

    // 1. Si TOUS les séides sont affectés, on termine la phase d'affectation
    if (unassignedMinions.length === 0) {
        G.assignmentStep = 'COMPLETED';
        G.statusMessage =
            'Toutes les affectations sont terminées. Début des combats !';
        events?.endPhase?.();
        return;
    }

    // 2. Si on est à l'étape FP et que tous les compagnons ont au moins 1 séide
    if (G.assignmentStep === 'FP_ASSIGN') {
        const allCompanionsHaveMinion = companions.every((comp) =>
            G.skirmishes.some(
                (s) => s.companionId === comp.id && s.minionIds.length > 0
            )
        );

        // Tous les compagnons sont déjà engagés et il reste des séides libres -> L'Ombre surcharge !
        if (allCompanionsHaveMinion) {
            G.assignmentStep = 'SHADOW_ASSIGN';
            G.statusMessage =
                "Surcharge ! L'Ombre affecte les séides restants à son choix.";
            events?.setActivePlayers?.({ value: { '1': 'play' } });
        }
    }
};

export const advanceCompany = (
    G: GameState,
    _ctx: Ctx,
    _playerID: string,
    events?: LotrEventsAPI
) => {
    const p0 = G.players['0'];
    const nextIndex = p0.currentSiteIndex + 1;

    if (nextIndex >= 9) return;

    const applyTwilightForSite = (siteIndex: number) => {
        const targetSite = G.path[siteIndex];
        if (!targetSite) return;

        const siteCost = Number(targetSite.twilightCost) || 0;

        const companionsCount = p0.fellowshipArea
            ? p0.fellowshipArea.length
            : 0;

        const totalAdded = siteCost + companionsCount;
        G.twilightPool += totalAdded;

        console.log(
            `[Twilight Calculation] Site cost: ${siteCost} + Companions: ${companionsCount} = +${totalAdded} Crépuscule (Total: ${G.twilightPool})`
        );
    };

    if (G.path[nextIndex] !== null) {
        p0.currentSiteIndex = nextIndex;
        applyTwilightForSite(nextIndex);

        G.statusMessage = `La compagnie avance au site ${nextIndex + 1} : ${G.path[nextIndex]?.name}`;
        events?.endPhase?.();
    } else {
        G.awaitingSiteSelection = true;
        G.statusMessage =
            "En attente du joueur de l'Ombre pour poser le prochain site...";

        events?.setActivePlayers?.({ value: { '1': 'play' } });
    }
};

export const passActionWindow = ({ G, ctx }: { G: GameState; ctx: Ctx }) => {
    if (!G.actionWindow) return;

    const currentPlayer = ctx.currentPlayer;
    const otherPlayer = currentPlayer === '0' ? '1' : '0';

    const updatedPassed = [
        ...(G.actionWindow.passedPlayers || []),
        currentPlayer,
    ];

    if (updatedPassed.includes('0') && updatedPassed.includes('1')) {
        G.actionWindow = {
            ...G.actionWindow,
            isOpen: false,
            passedPlayers: [],
        };
    } else {
        G.actionWindow = {
            ...G.actionWindow,
            activePlayerId: otherPlayer,
            passedPlayers: updatedPassed,
        };
    }
};

// 🛠️ MOVES COMMUNS STRICTEMENT TYPÉS
const commonMoves = {
    passActionWindow,

    // 🛠️ MOVES DEV
    devSetTwilight: ({ G }: LotrMoveContext, amount: number) => {
        G.twilightPool = Math.max(0, amount);
    },

    devSetPhase: ({ events }: LotrPhaseContext, targetPhase: string) => {
        if (events) {
            events.setPhase?.(targetPhase);
        }
    },

    devForceEndPhase: ({ events }: LotrMoveContext) => {
        if (events) {
            events.setActivePlayers?.({ value: { '0': 'play', '1': 'play' } });
            events.endPhase?.();
        }
    },

    devLoadPreset: ({ G }: LotrMoveContext, presetType: DevPresetType) => {
        if (presetType === 'ARCHERY_TEST') {
            G.twilightPool = 8;
            G.players['0'].fellowshipArea = [
                {
                    id: 'dev-legolas',
                    name: 'Legolas',
                    kind: 'FREE_PEOPLES',
                    type: 'COMPANION',
                    twilightCost: 2,
                    strength: 6,
                    vitality: 3,
                    culture: 'ELVEN',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: true,
                },
            ];
            G.battlefield = [
                {
                    id: 'dev-nazgul',
                    name: 'Ukursh, Archor',
                    kind: 'SHADOW',
                    type: 'MINION',
                    twilightCost: 4,
                    strength: 9,
                    vitality: 2,
                    culture: 'RINGWRAITH',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: false,
                },
                {
                    id: 'dev-nazgul-2',
                    name: 'Ukursh, Archor',
                    kind: 'SHADOW',
                    type: 'MINION',
                    twilightCost: 4,
                    strength: 9,
                    vitality: 2,
                    culture: 'RINGWRAITH',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: false,
                },
                {
                    id: 'dev-nazgul-3',
                    name: 'Ukursh, Archor',
                    kind: 'SHADOW',
                    type: 'MINION',
                    twilightCost: 4,
                    strength: 9,
                    vitality: 2,
                    culture: 'RINGWRAITH',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: false,
                },
                {
                    id: 'dev-nazgul-4',
                    name: 'Ukursh, Archor',
                    kind: 'SHADOW',
                    type: 'MINION',
                    twilightCost: 4,
                    strength: 9,
                    vitality: 2,
                    culture: 'RINGWRAITH',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: false,
                },
                {
                    id: 'dev-nazgul-5',
                    name: 'Ukursh, Archor',
                    kind: 'SHADOW',
                    type: 'MINION',
                    twilightCost: 4,
                    strength: 9,
                    vitality: 2,
                    culture: 'RINGWRAITH',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: false,
                },
                {
                    id: 'dev-nazgul-6',
                    name: 'Ukursh, Archor',
                    kind: 'SHADOW',
                    type: 'MINION',
                    twilightCost: 4,
                    strength: 9,
                    vitality: 2,
                    culture: 'RINGWRAITH',
                    gameText: 'Archerie test card',
                    title: 'efsfsdf',
                    isUnique: false,
                },
            ];
            G.statusMessage = '[DEV] Preset Archerie chargé !';
        }
    },

    drawCard: ({ G, ctx, playerID }: LotrMoveContext) => {
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
        { G, ctx, playerID }: LotrMoveContext,
        payload: ReorderPayload
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
        { G, playerID, events }: LotrMoveContext,
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

            const siteCost = Number(playedSite.twilightCost) || 0;
            const companionsCount = p0.fellowshipArea
                ? p0.fellowshipArea.length
                : 0;
            G.twilightPool += siteCost + companionsCount;

            G.statusMessage = `Nouveau site révélé ! La compagnie avance en ${playedSite.name}. (+${siteCost + companionsCount} Crépuscule)`;
            events?.endPhase?.();
        }
    },

    transferAttachment: (
        { G, ctx, playerID }: LotrMoveContext,
        payload: TransferPayload
    ) => {
        const { attachmentId, fromCharacterId, toCharacterId } = payload;
        const targetId = getTargetPlayerId(playerID, ctx);
        const player = G.players?.[targetId];
        if (!player) return;

        const allPossibleHosts: CardState[] = [
            ...(player.fellowshipArea || []),
            ...(player.supportArea || []),
            ...(G.battlefield || []),
        ];

        const sourceHost = fromCharacterId
            ? allPossibleHosts.find((c) => c.id === fromCharacterId)
            : allPossibleHosts.find((c) =>
                  c.attachments?.some((a) => a.id === attachmentId)
              );

        if (!sourceHost || !sourceHost.attachments) return 'INVALID_MOVE';

        const targetHost = allPossibleHosts.find((c) => c.id === toCharacterId);
        if (!targetHost || sourceHost.id === targetHost.id)
            return 'INVALID_MOVE';

        const attachIndex = sourceHost.attachments.findIndex(
            (a) => a.id === attachmentId
        );
        if (attachIndex === -1) return 'INVALID_MOVE';

        const [movedAttachment] = sourceHost.attachments.splice(attachIndex, 1);

        if (!targetHost.attachments) {
            targetHost.attachments = [];
        }
        targetHost.attachments.push(movedAttachment);

        G.statusMessage = `${movedAttachment.name || 'Attachement'} est transféré de ${sourceHost.name || 'son hôte'} vers ${targetHost.name || 'sa cible'}.`;
    },
};

export const LotrGame: Game<GameState> = {
    setup: (): GameState => ({
        twilightPool: 0,
        currentSiteIndex: 0,
        movesThisTurn: 0,
        statusMessage: 'Phase de Communauté : préparez vos compagnons.',
        awaitingSiteSelection: false,
        skirmishes: [],
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
            },
            '1': {
                ...createInitialPlayer('1'),
                sitesDeck: DUMMY_SITES_PLAYER_0.slice(1),
                currentSiteIndex: 0,
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

                    const cost = Number(card.twilightCost) || 0;
                    G.twilightPool += cost;
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

                    if (!targetMinion.attachments) {
                        targetMinion.attachments = [];
                    }
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
            turn: {
                // boardgame.io active automatiquement le joueur FP ('0') à l'entrée de la phase
                activePlayers: { value: { '0': 'play' } },
            },
            onBegin: ({ G }: LotrPhaseContext) => {
                console.log('[Assignment onBegin] Démarrage de la phase...');
                G.skirmishes = [];

                const unassignedMinions = getUnassignedMinions(G);
                console.log(
                    '[Assignment onBegin] Séides non affectés :',
                    unassignedMinions.length
                );

                // 💡 On change juste le message ou le statut d'étape
                if (unassignedMinions.length === 0) {
                    G.assignmentStep = 'COMPLETED';
                    G.statusMessage =
                        'Aucun séide en jeu : pas d’affectation nécessaire.';
                } else {
                    G.assignmentStep = 'FP_ASSIGN';
                    G.statusMessage =
                        'Phase d’Affectation : Le joueur des Peuples Libres attribue les séides aux compagnons.';
                }
                // ⚠️ PLUS AUCUN appel à events.setActivePlayers ou events.endPhase ici !
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

    console.log('🔍 Debug assignMinion :', {
        playerID,
        isFP,
        isShadow,
        assignmentStep: G.assignmentStep,
        minionId,
        companionId
    });

    if (G.assignmentStep === 'FP_ASSIGN' && !isFP) {
        console.warn('❌ Bloqué: FP_ASSIGN alors que playerID != 0');
        return 'INVALID_MOVE';
    }
    if (G.assignmentStep === 'SHADOW_ASSIGN' && !isShadow) {
        console.warn('❌ Bloqué: SHADOW_ASSIGN alors que playerID != 1');
        return 'INVALID_MOVE';
    }

    // Retirer le séide d'une autre escarmouche si nécessaire
    G.skirmishes.forEach((s) => {
        s.minionIds = s.minionIds.filter((id) => id !== minionId);
    });

    let skirmish = G.skirmishes.find(
        (s) => s.companionId === companionId
    );

    if (skirmish) {
        // Condition temporairement désactivée pour tests
        /*
        if (
            G.assignmentStep === 'FP_ASSIGN' &&
            skirmish.minionIds.length >= 1
        ) {
            return 'INVALID_MOVE';
        }
        */
        if (!skirmish.minionIds.includes(minionId)) {
            skirmish.minionIds.push(minionId);
        }
    } else {
        G.skirmishes.push({
            id: `skirmish_${companionId}`,
            companionId,
            minionIds: [minionId],
        });
    }

    // Nettoyage des escarmouches vides
    G.skirmishes = G.skirmishes.filter((s) => s.minionIds.length > 0);

    const minionCard = G.battlefield.find((c) => c.id === minionId);
    const compCard = G.players['0']?.fellowshipArea.find(
        (c) => c.id === companionId
    );

    G.statusMessage = `${minionCard?.name || 'Le séide'} est affecté à ${compCard?.name || 'son compagnon'}.`;

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
