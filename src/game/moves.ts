import type { Ctx } from 'boardgame.io';
import type { GameState, LotrMoveContext, LotrPhaseContext } from './types';
import {
    resolveSkirmish,
    finishSkirmishResolution,
    applyWoundToCard,
} from './skirmish';
import { drawCardsForPlayer } from '../utils/drawCards';

export interface ReorderPayload {
    fromIndex?: number;
    toIndex?: number;
    oldIndex?: number;
    newIndex?: number;
}

export interface TransferPayload {
    attachmentId: string;
    fromCharacterId?: string;
    toCharacterId: string;
}

export type DevPresetType = 'ARCHERY_TEST' | 'SKIRMISH_TEST';

export const getTargetPlayerId = (
    playerID: string | undefined,
    ctx: Ctx
): string => {
    if (playerID !== undefined && playerID !== null && playerID !== '') {
        return String(playerID);
    }
    return String(ctx.currentPlayer ?? '0');
};

export const advanceCompany = (G: GameState) => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) {
        console.warn('❌ [moves.advanceCompany] Joueur FP introuvable !');
        return;
    }

    const nextIndex = fpPlayer.currentSiteIndex + 1;

    if (nextIndex >= 9) {
        console.warn("⚠️ [moves.advanceCompany] Index >= 9, impossible d'avancer.");
        return;
    }

    G.movesThisTurn = (G.movesThisTurn || 0) + 1;
    fpPlayer.currentSiteIndex = nextIndex;

    const targetSite = G.path[nextIndex];

    if (targetSite !== null) {
        const siteCost = Number(targetSite.twilightCost) || 0;
        const companionsCount = fpPlayer.fellowshipArea
            ? fpPlayer.fellowshipArea.length
            : 0;
        const totalAdded = siteCost + companionsCount;
        G.twilightPool += totalAdded;

        G.statusMessage = `La compagnie avance au site ${nextIndex + 1} : ${targetSite.name}`;
    } else {
        G.awaitingSiteSelection = true;

        G.statusMessage =
            "En attente du joueur de l'Ombre pour poser le prochain site...";
    }
};

export const passActionWindow = ({
    G,
    ctx,
    playerID,
    events,
}: LotrMoveContext) => {
    if (!G.actionWindow || !G.actionWindow.isOpen) {
        console.warn('⚠️ [moves.passActionWindow] Aucune fenêtre d’action ouverte.');
        return;
    }
    if (playerID !== G.actionWindow.activePlayerId) {
        console.warn(
            `❌ [moves.passActionWindow] Tentative de passer hors tour. Actif: ${G.actionWindow.activePlayerId}, Reçu: ${playerID}`
        );
        return;
    }

    const otherPlayer = playerID === '0' ? '1' : '0';
    const currentPasses = (G.actionWindow.passesCount || 0) + 1;


    if (currentPasses >= 2) {
        G.actionWindow = {
            ...G.actionWindow,
            isOpen: false,
            passesCount: 0,
        };

        if (ctx.phase === 'maneuver') {
            G.statusMessage =
                'Manœuvre terminée. Passage à la phase d’Archerie.';
            events?.endPhase?.();
        } else if (ctx.phase === 'archery') {
            G.statusMessage =
                'Archerie terminée. Passage à la phase d’Affectation.';
            events?.endPhase?.();
        } else if (ctx.phase === 'skirmish' && G.activeSkirmishId) {
            resolveSkirmish(G, ctx);
        } else if (ctx.phase === 'regroup') {
            G.regroupStep = 'SHADOW_REFILL';
            G.statusMessage =
                'Ombre : Vous pouvez défausser 1 carte, puis validez votre main à 8 cartes.';
        }
    } else {
        const fpId = G.fpPlayerId || '0';
        G.actionWindow = {
            ...G.actionWindow,
            activePlayerId: otherPlayer,
            passesCount: currentPasses,
            message: `Au tour du joueur ${otherPlayer === fpId ? 'FP' : 'Ombre'} d’agir ou de passer.`,
        };
    }
};

export const commonMoves = {
    passActionWindow,
    advanceCompany,

    // 🟢 1. JOUER UN ATTACHEMENT (SÉCURISÉ)
    attachCard: (
        { G, ctx, playerID }: LotrMoveContext,
        cardIndex: number,
        targetId: string
    ) => {
        const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';
        const player = G.players[actingPlayerId];

        if (!player || !player.hand || !player.hand[cardIndex]) {
            console.warn(
                '❌ [moves.attachCard] Carte ou joueur introuvable !',
                { actingPlayerId, cardIndex }
            );
            return 'INVALID_MOVE';
        }

        const card = player.hand[cardIndex];
        const fpId = G.fpPlayerId || '0';
        const isFP = actingPlayerId === fpId;

        // 🔒 VERROU DE PHASE : Les cartes FP ne se jouent qu'en 'fellowship', les cartes Ombre qu'en 'shadow'
        if (isFP && ctx.phase !== 'fellowship') {
            console.warn(
                `❌ [moves.attachCard] Rejet : FP ne peut pas attacher en phase ${ctx.phase}.`
            );
            return 'INVALID_MOVE';
        }
        if (!isFP && ctx.phase !== 'shadow') {
            console.warn(
                `❌ [moves.attachCard] Rejet : Ombre ne peut pas attacher en phase ${ctx.phase}.`
            );
            return 'INVALID_MOVE';
        }

        // 1. Recherche de la cible
        const fpPlayer = G.players[fpId];
        const allPossibleTargets = [
            ...(fpPlayer?.fellowshipArea || []),
            ...(fpPlayer?.supportArea || []),
            ...(player.supportArea || []),
            ...(G.battlefield || []),
        ];

        const targetCharacter = allPossibleTargets.find(
            (c) => c.id === targetId
        );

        if (!targetCharacter) {
            console.warn(
                `❌ [moves.attachCard] Cible ${targetId} introuvable.`
            );
            return 'INVALID_MOVE';
        }

        // 2. Coûts & Faction
        const cost = Number(card.twilightCost) || 0;

        if (isFP) {
            if (card.kind !== 'FREE_PEOPLES') return 'INVALID_MOVE';
            G.twilightPool += cost;
        } else {
            if (card.kind !== 'SHADOW') return 'INVALID_MOVE';
            if (G.twilightPool < cost) {
                console.warn(`❌ [moves.attachCard] Crépuscule insuffisant (${G.twilightPool}/${cost}).`);
                G.statusMessage = `Crépuscule insuffisant pour attacher ${card.title} (Requis: ${cost}, Dispo: ${G.twilightPool})`;
                return 'INVALID_MOVE';
            }
            G.twilightPool -= cost;
        }

        // 3. Application
        const [attachedCard] = player.hand.splice(cardIndex, 1);
        if (!targetCharacter.attachments) {
            targetCharacter.attachments = [];
        }
        targetCharacter.attachments.push(attachedCard);

        const cardName = attachedCard.title || attachedCard.name || 'Une carte';
        const targetName =
            targetCharacter.title || targetCharacter.name || 'le personnage';

        G.statusMessage = `${cardName} a été attaché à ${targetName}.`;
    },

    // 🟢 2. JOUER UNE CARTE (SÉCURISÉ)
    playCard: ({ G, ctx, playerID }: LotrMoveContext, cardIndex: number) => {
        const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';
        const player = G.players[actingPlayerId];

        if (!player || !player.hand || !player.hand[cardIndex]) {
            console.warn('❌ [moves.playCard] Carte ou joueur introuvable !', {
                actingPlayerId,
                cardIndex,
            });
            return 'INVALID_MOVE';
        }

        const card = player.hand[cardIndex];
        const fpId = G.fpPlayerId || '0';
        const isFP = actingPlayerId === fpId;

        // 🔒 VERROU DE PHASE
        if (isFP && ctx.phase !== 'fellowship') {
            console.warn(
                `❌ [moves.playCard] Rejet : Le joueur FP ne peut pas jouer de carte en phase ${ctx.phase}.`
            );
            return 'INVALID_MOVE';
        }
        if (!isFP && ctx.phase !== 'shadow') {
            console.warn(
                `❌ [moves.playCard] Rejet : Le joueur Ombre ne peut pas jouer de carte en phase ${ctx.phase}.`
            );
            return 'INVALID_MOVE';
        }

        // 1. JOUER UNE CARTE PEUPLES LIBRES
        if (isFP) {
            if (card.kind !== 'FREE_PEOPLES') return 'INVALID_MOVE';

            const cost = Number(card.twilightCost) || 0;
            const [playedCard] = player.hand.splice(cardIndex, 1);
            G.twilightPool += cost;

            if (playedCard.type === 'COMPANION') {
                if (!player.fellowshipArea) player.fellowshipArea = [];
                player.fellowshipArea.push(playedCard);
                G.statusMessage = `${playedCard.title} rejoint la Communauté (+${cost} Crépuscule).`;
            } else if (
                playedCard.type === 'ALLY' ||
                playedCard.type === 'FOLLOWER' ||
                playedCard.type.endsWith('_SUPPORT')
            ) {
                if (!player.supportArea) player.supportArea = [];
                player.supportArea.push(playedCard);
                G.statusMessage = `${playedCard.title} rejoint l'aire de soutien (+${cost} Crépuscule).`;
            } else if (playedCard.type === 'EVENT') {
                if (!player.discard) player.discard = [];
                player.discard.push(playedCard);
                G.statusMessage = `${playedCard.title} est joué (+${cost} Crépuscule).`;
            } else {
                player.hand.splice(cardIndex, 0, playedCard);
                G.twilightPool -= cost;
                return 'INVALID_MOVE';
            }

            return;
        }

        // 2. JOUER UNE CARTE OMBRE
        if (!isFP) {
            if (card.kind !== 'SHADOW') return 'INVALID_MOVE';

            const cost = Number(card.twilightCost) || 0;
            if (G.twilightPool < cost) {
                console.warn(`❌ [moves.playCard] Crépuscule insuffisant pour Ombre (${G.twilightPool}/${cost})`);
                G.statusMessage = `Crépuscule insuffisant pour jouer ${card.title} (Requis: ${cost}, Dispo: ${G.twilightPool})`;
                return 'INVALID_MOVE';
            }

            G.twilightPool -= cost;
            const [playedCard] = player.hand.splice(cardIndex, 1);

            if (playedCard.type === 'MINION') {
                if (!G.battlefield) G.battlefield = [];
                G.battlefield.push(playedCard);
                G.statusMessage = `${playedCard.title} entre sur le champ de bataille (-${cost} Crépuscule).`;
            } else if (
                playedCard.type === 'ALLY' ||
                playedCard.type === 'FOLLOWER' ||
                playedCard.type.endsWith('_SUPPORT')
            ) {
                if (!player.supportArea) player.supportArea = [];
                player.supportArea.push(playedCard);
                G.statusMessage = `${playedCard.title} rejoint l'aire de soutien de l'Ombre (-${cost} Crépuscule).`;
            } else if (playedCard.type === 'EVENT') {
                if (!player.discard) player.discard = [];
                player.discard.push(playedCard);
                G.statusMessage = `${playedCard.title} est joué (-${cost} Crépuscule).`;
            } else {
                player.hand.splice(cardIndex, 0, playedCard);
                G.twilightPool += cost;
                return 'INVALID_MOVE';
            }
        }
    },

    endFellowshipPhase: ({ G, ctx, events, playerID }: LotrMoveContext) => {
        const fpId = G.fpPlayerId || '0';
        const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';

        if (actingPlayerId !== fpId) {
            console.warn(
                '❌ [moves.endFellowshipPhase] Rejet: Seul FP peut terminer Fellowship.'
            );
            return 'INVALID_MOVE';
        }
        advanceCompany(G);

        if (!G.awaitingSiteSelection) {
            events?.setPhase?.('shadow');
        }
    },

    endTurnChoice: ({ G }: LotrMoveContext) => {
        G.regroupStep = 'FP_REFILL';
        G.statusMessage =
            'Peuples Libres : Ajustez votre main à 8 cartes et validez pour terminer le tour.';
    },

    discardCardFromHand: (
        { G, events, playerID }: LotrMoveContext,
        cardIndex: number
    ) => {
        const actingPlayerId = playerID ?? '0';
        const player = G.players?.[actingPlayerId];
        if (!player || !player.hand[cardIndex]) return 'INVALID_MOVE';

        const shadowPlayerId = G.fpPlayerId === '0' ? '1' : '0';
        const fpPlayerId = G.fpPlayerId || '0';

        // 🔒 1. Vérification du rôle actif
        if (
            G.regroupStep === 'SHADOW_REFILL' &&
            actingPlayerId !== shadowPlayerId
        ) {
            console.warn('❌ [moves.discardCardFromHand] Ce n’est pas au tour de l’Ombre de défausser.');
            return 'INVALID_MOVE';
        }
        if (G.regroupStep === 'FP_REFILL' && actingPlayerId !== fpPlayerId) {
            console.warn('❌ [moves.discardCardFromHand] Ce n’est pas au tour de FP de défausser.');
            return 'INVALID_MOVE';
        }

        // 🔒 2. RÈGLE STRICTE PAR JOUEUR
        if (player.hand.length <= 8 && player.hasDiscardedInRegroup) {
            console.warn(`⚠️ [moves.discardCardFromHand] Le Joueur ${actingPlayerId} a déjà défaussé sa carte optionnelle.`);
            G.statusMessage =
                'Vous avez déjà défaussé votre carte optionnelle pour ce tour.';
            return 'INVALID_MOVE';
        }

        const [discarded] = player.hand.splice(cardIndex, 1);
        if (!player.discard) player.discard = [];
        player.discard.push(discarded);

        player.hasDiscardedInRegroup = true;

        G.statusMessage = `${player.profile?.name || `Joueur ${actingPlayerId}`} a défaussé ${discarded.title || discarded.name}.`;

        if (player.hand.length <= 8) {
            commonMoves.confirmHandRefill({ G, events, playerID });
        }
    },

    confirmHandRefill: ({ G, events, playerID }: LotrMoveContext) => {
        const actingPlayerId = playerID ?? '0';
        const player = G.players?.[actingPlayerId];
        if (!player) return 'INVALID_MOVE';

        if (!player.discard) player.discard = [];

        // Reconstitution / Élagage à 8 cartes
        while (player.hand.length > 8) {
            const discarded = player.hand.pop();
            if (discarded) player.discard.push(discarded);
        }

        if (player.hand.length < 8) {
            const needed = 8 - player.hand.length;
            drawCardsForPlayer(G, player, needed, false);
        }

        player.hasDiscardedInRegroup = false;

        // --- TRANSITIONS DE REGROUPEMENT ---
        if (G.regroupStep === 'SHADOW_REFILL') {
            if ((G.movesThisTurn || 0) >= 2) {
                G.regroupStep = 'FP_REFILL';
                G.statusMessage =
                    'Limite de déplacement atteinte (2/2). Reconstitution de la main des Peuples Libres.';
            } else {
                G.regroupStep = 'FP_DECISION';
                G.statusMessage =
                    "Peuples Libres : Choisissez d'avancer au site suivant ou de terminer le tour.";
            }
            return;
        }

        if (G.regroupStep === 'FP_DECISION') {
            G.regroupStep = 'FP_REFILL';
        }

        if (G.regroupStep === 'FP_REFILL' || !G.regroupStep) {
            console.log('🔄 [moves.confirmHandRefill] Fin du tour complet. Nettoyage du champ de bataille et passage de rôle.');
            const shadowId = G.fpPlayerId === '0' ? '1' : '0';
            const shadowPlayer = G.players[shadowId];

            if (shadowPlayer) {
                if (!shadowPlayer.discard) shadowPlayer.discard = [];
                G.battlefield.forEach((minion) => {
                    shadowPlayer.discard.push(minion);
                });
            }

            G.battlefield = [];
            G.twilightPool = 0;
            G.movesThisTurn = 0;
            G.skirmishes = [];
            G.activeSkirmishId = undefined;
            G.regroupStep = undefined;

            const nextFpPlayerId = G.fpPlayerId === '0' ? '1' : '0';
            G.fpPlayerId = nextFpPlayerId;

            G.statusMessage = `Nouveau tour ! Le joueur ${nextFpPlayerId} devient les Peuples Libres.`;

            events?.endTurn?.({ next: nextFpPlayerId });
            events?.setPhase?.('fellowship');
        }
    },

    confirmEndPhase: ({ G, events }: LotrMoveContext) => {
        if (G.pendingPhaseEnd) {
            console.log('✅ [moves.confirmEndPhase] Phase terminée confirmée.');
            G.pendingPhaseEnd = false;
            events?.endPhase?.();
        }
    },

    finishSkirmishResolution: ({ G, ctx, events }: LotrMoveContext) => {
        console.log('⚔️ [moves.finishSkirmishResolution] Clôture escarmouche.');
        finishSkirmishResolution(G, ctx, events);
    },

    applyWound: ({ G }: LotrMoveContext, targetCardId: string) => {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];

        const companion = fpPlayer?.fellowshipArea?.find(
            (c) => c.id === targetCardId
        );
        const minion = G.battlefield.find((c) => c.id === targetCardId);
        const targetCard = companion || minion;

        if (targetCard) {
            console.log(`💥 [moves.applyWound] Blessure appliquée à ${targetCard.title || targetCard.name}`);
            applyWoundToCard(G, targetCard, 1);
        }
    },

    devSetTwilight: ({ G }: LotrMoveContext, amount: number) => {
        console.log(`🔧 [DEV] Twilight ajusté à ${amount}`);
        G.twilightPool = Math.max(0, amount);
    },

    devSetPhase: ({ G, events }: LotrPhaseContext, targetPhase: string) => {
        console.log(`🔧 [DEV] Forçage de la phase vers : ${targetPhase}`);
        G.actionWindow = undefined;
        G.skirmishes = [];
        G.activeSkirmishId = undefined;

        if (targetPhase === 'regroup') {
            G.regroupStep = 'SHADOW_REFILL';
            if (!G.movesThisTurn) {
                G.movesThisTurn = 1;
            }
        } else {
            G.regroupStep = undefined;
        }

        events?.setPhase?.(targetPhase);
    },

    devForceEndPhase: ({ events }: LotrMoveContext) => {
        console.log('🔧 [DEV] Forçage fin de phase.');
        if (events) {
            events.setActivePlayers?.({ value: { '0': 'play', '1': 'play' } });
            events.endPhase?.();
        }
    },

    devLoadPreset: ({ G }: LotrMoveContext, presetType: DevPresetType) => {
        console.log(`🔧 [DEV] Chargement du preset : ${presetType}`);
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];

        if (presetType === 'ARCHERY_TEST' && fpPlayer) {
            G.twilightPool = 8;
            G.burdens = 3;

            Object.keys(G.players).forEach((pId) => {
                const player = G.players[pId];
                if (player) {
                    player.hand = [];
                    drawCardsForPlayer(G, player, 4, false);
                }
            });

            fpPlayer.fellowshipArea = [
                {
                    id: '2c102',
                    title: 'Frodon',
                    subtitle: 'Aventurier Malgré Lui',
                    imageUrl: '/cards_visuals/lotr2c102.jpg',
                    kind: 'FREE_PEOPLES',
                    type: 'COMPANION',
                    race: 'HOBBIT',
                    keywords: ['RING-BEARER'],
                    resistance: 10,
                    signet: 'ARAGORN',
                    twilightCost: 0,
                    strength: 3,
                    vitality: 4,
                    culture: 'SHIRE',
                    isUnique: true,
                    gameText:
                        'Le coût de chaque artefact, possession et récit {CULTURE_SHIRE} joué sur Frodon est de -1.',
                    loreText:
                        "Je ne suis pas fait pour les quêtes périlleuses. Je voudrais bien n'avoir jamais vu l'Anneau! Pourquoi m'est-il venu? Pourquoi ai-je été choisi?",
                },
                {
                    id: '1r50',
                    title: 'Legolas',
                    subtitle: 'Vertefeuille',
                    keywords: ['ARCHER'],
                    imageUrl: '/cards_visuals/lotr1r50.jpg',
                    kind: 'FREE_PEOPLES',
                    signet: 'FRODO',
                    resistance: 6,
                    race: 'ELF',
                    type: 'COMPANION',
                    twilightCost: 2,
                    strength: 6,
                    vitality: 3,
                    culture: 'ELVEN',
                    isUnique: true,
                    gameText: 'sfdxfdsfsdfsd',
                },
                {
                    id: '1r13',
                    title: 'Gimli',
                    subtitle: 'Fils de Glóin',
                    imageUrl: '/cards_visuals/lotr1r13.jpg',
                    kind: 'FREE_PEOPLES',
                    keywords: ['DAMAGE'],
                    signet: 'GANDALF',
                    resistance: 6,
                    race: 'DWARF',
                    type: 'COMPANION',
                    twilightCost: 2,
                    strength: 6,
                    vitality: 3,
                    culture: 'DWARVEN',
                    isUnique: true,
                    gameText:
                        '**Skirmish:** Exert Gimli to make him strength +2',
                },
            ];
            G.battlefield = [
                {
                    id: '1c191',
                    title: 'Éclaireur de la Moria',
                    imageUrl: '/cards_visuals/lotr1c191.jpg',
                    kind: 'SHADOW',
                    race: 'ORC',
                    roaming: 4,
                    type: 'MINION',
                    twilightCost: 1,
                    strength: 5,
                    vitality: 3,
                    culture: 'MORIA',
                    isUnique: false,
                    gameText: 'wlmdfdxlmfkdlsmfksmdlf',
                },
                {
                    id: '1c271',
                    title: 'Soldat Orque',
                    imageUrl: '/cards_visuals/lotr1c271.jpg',
                    kind: 'SHADOW',
                    race: 'ORC',
                    roaming: 6,
                    type: 'MINION',
                    twilightCost: 2,
                    strength: 7,
                    vitality: 2,
                    culture: 'SAURON',
                    isUnique: false,
                    gameText: 'wdfjdsklwfjklsdfjkldsflksd',
                },
            ];
            G.statusMessage =
                '[DEV] Preset Archerie chargé (mains de 4 cartes) !';
        }
    },

    drawCard: ({ G, ctx, playerID }: LotrMoveContext, count: number = 1) => {
        const targetId = getTargetPlayerId(playerID, ctx);
        const player = G.players[targetId];
        if (!player) return 'INVALID_MOVE';

        const isFellowship = ctx.phase === 'fellowship';
        const drawn = drawCardsForPlayer(G, player, count, isFellowship);

        console.log(`🎴 [moves.drawCard] Joueur ${targetId} a pioché ${drawn} carte(s).`);

        if (drawn === 0 && isFellowship && G.fellowshipCardsDrawn >= 4) {
            G.statusMessage =
                'Limite de 4 cartes obtenues pendant la phase de Communauté atteinte.';
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
        console.log(`🔄 [moves.reorderFellowship] Carte réordonnée dans la compagnie de ${fromIndex} vers ${toIndex}.`);
    },

    playSite: (
        { G, ctx, events, playerID }: LotrMoveContext,
        siteId: string,
        targetIndex: number
    ) => {
        const fpId = G.fpPlayerId || '0';
        const shadowId = fpId === '0' ? '1' : '0';

        if (!G.awaitingSiteSelection) {
            console.warn(
                `❌ [moves.playSite] Rejet : Impossible de poser un site hors de l'avancée de la compagnie.`
            );
            return 'INVALID_MOVE';
        }

        if (playerID !== shadowId) {
            console.warn(
                `❌ [moves.playSite] Rejet : Seul le joueur de l'Ombre (${shadowId}) peut poser le prochain site.`
            );
            return 'INVALID_MOVE';
        }

        const player = G.players[playerID];
        if (!player || !player.sitesDeck) return 'INVALID_MOVE';

        const siteIndex = player.sitesDeck.findIndex((s) => s.id === siteId);
        if (siteIndex === -1) {
            console.warn(`❌ [moves.playSite] Site ${siteId} introuvable dans le deck de sites de l'Ombre.`);
            return 'INVALID_MOVE';
        }

        const nextEmptyIndex = G.path.findIndex((slot) => slot === null);
        if (targetIndex !== nextEmptyIndex) {
            console.warn(`❌ [moves.playSite] Index cible ${targetIndex} ne correspond pas au prochain emplacement vide ${nextEmptyIndex}.`);
            return 'INVALID_MOVE';
        }

        const playedSite = player.sitesDeck[siteIndex];

        if (
            playedSite.siteNumber !== undefined &&
            playedSite.siteNumber !== targetIndex + 1
        ) {
            console.warn(
                `❌ [moves.playSite] Le site ${playedSite.name} (#${playedSite.siteNumber}) ne match pas l'emplacement ${targetIndex + 1}.`
            );
            return 'INVALID_MOVE';
        }

        player.sitesDeck.splice(siteIndex, 1);
        playedSite.ownerId = playerID;
        G.path[targetIndex] = playedSite;

        G.awaitingSiteSelection = false;
        const fpPlayer = G.players[fpId];

        if (fpPlayer) {
            fpPlayer.currentSiteIndex = targetIndex;
        }

        const siteCost = Number(playedSite.twilightCost) || 0;
        const companionsCount = fpPlayer?.fellowshipArea
            ? fpPlayer.fellowshipArea.length
            : 0;
        const addedTwilight = siteCost + companionsCount;
        G.twilightPool += addedTwilight;

        console.log(`🗺️ [moves.playSite] Site ${playedSite.name} placé sur la case ${targetIndex + 1}. +${addedTwilight} Crépuscule ajouté.`);
        G.statusMessage = `Nouveau site révélé par l'Ombre ! La compagnie avance en ${playedSite.name} (+${addedTwilight} Crépuscule).`;

        if (ctx.phase === 'regroup') {
            G.skirmishes = [];
            G.activeSkirmishId = undefined;
            events?.setPhase?.('shadow');
        } else {
            G.pendingPhaseEnd = true;
        }
    },

    transferAttachment: (
        { G, ctx, playerID }: LotrMoveContext,
        payload: TransferPayload
    ) => {
        const { attachmentId, fromCharacterId, toCharacterId } = payload;
        const targetId = getTargetPlayerId(playerID, ctx);
        const player = G.players?.[targetId];
        if (!player) return 'INVALID_MOVE';

        const allPossibleHosts = [
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

        const attachIndex = sourceHost.attachments.findIndex(
            (a) => a.id === attachmentId
        );
        if (attachIndex === -1) return 'INVALID_MOVE';

        const movedAttachment = sourceHost.attachments[attachIndex];

        const fpId = G.fpPlayerId || '0';
        const shadowId = fpId === '0' ? '1' : '0';

        if (movedAttachment.kind === 'SHADOW') {
            if (ctx.phase !== 'shadow' || playerID !== shadowId) {
                return 'INVALID_MOVE';
            }
        } else {
            if (ctx.phase !== 'fellowship' || playerID !== fpId) {
                return 'INVALID_MOVE';
            }
        }

        const targetHost = allPossibleHosts.find((c) => c.id === toCharacterId);
        if (!targetHost || sourceHost.id === targetHost.id)
            return 'INVALID_MOVE';

        const cost = Number(movedAttachment.twilightCost) || 0;

        if (movedAttachment.kind === 'SHADOW') {
            if (G.twilightPool < cost) return 'INVALID_MOVE';
            G.twilightPool -= cost;
        } else {
            G.twilightPool += cost;
        }

        sourceHost.attachments.splice(attachIndex, 1);

        if (!targetHost.attachments) {
            targetHost.attachments = [];
        }
        targetHost.attachments.push(movedAttachment);

        const attachmentTitle =
            movedAttachment.title || movedAttachment.name || 'Attachement';
        const sourceTitle = sourceHost.title || sourceHost.name || 'son hôte';
        const targetTitle = targetHost.title || targetHost.name || 'sa cible';

        console.log(`🔀 [moves.transferAttachment] ${attachmentTitle} transféré de ${sourceTitle} à ${targetTitle}.`);
        G.statusMessage = `${attachmentTitle} est transféré de ${sourceTitle} vers ${targetTitle} (Coût : ${cost} Crépuscule).`;
    },
};