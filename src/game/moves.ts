import type { Ctx } from 'boardgame.io';
import type { GameState, LotrMoveContext, LotrPhaseContext } from './types';
import {
    resolveSkirmish,
    finishSkirmishResolution,
    applyWoundToCard,
} from './skirmish';

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

export const advanceCompany = (G: GameState, ctx: Ctx) => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) return;

    const nextIndex = fpPlayer.currentSiteIndex + 1;

    if (nextIndex >= 9) return;

    // Incrémente le compteur de déplacements pour ce tour
    G.movesThisTurn = (G.movesThisTurn || 0) + 1;

    const applyTwilightForSite = (siteIndex: number) => {
        const targetSite = G.path[siteIndex];
        if (!targetSite) return;

        const siteCost = Number(targetSite.twilightCost) || 0;
        const companionsCount = fpPlayer.fellowshipArea
            ? fpPlayer.fellowshipArea.length
            : 0;
        const totalAdded = siteCost + companionsCount;

        G.twilightPool += totalAdded;
    };

    if (G.path[nextIndex] !== null) {
        fpPlayer.currentSiteIndex = nextIndex;
        applyTwilightForSite(nextIndex);

        G.statusMessage = `La compagnie avance au site ${nextIndex + 1} : ${G.path[nextIndex]?.name} (Déplacement ${G.movesThisTurn}/2)`;

        // 🟢 Temporisation globale
        G.pendingPhaseEnd = true;
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
    if (!G.actionWindow || !G.actionWindow.isOpen) return;
    if (playerID !== G.actionWindow.activePlayerId) return;

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

        // 1. Recherche de la cible (Compagnon, Allié dans FellowshipArea, ou Minion dans Battlefield/SupportArea)
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
                `❌ [moves.attachCard] Personnage cible ${targetId} introuvable.`
            );
            return 'INVALID_MOVE';
        }

        // 2. Vérification des coûts et de la faction
        const cost = Number(card.twilightCost) || 0;

        if (isFP) {
            if (card.kind !== 'FREE_PEOPLES') return 'INVALID_MOVE';
            // Jouer une carte FP ajoute du twilight pool
            G.twilightPool += cost;
        } else {
            if (card.kind !== 'SHADOW') return 'INVALID_MOVE';
            // L'Ombre doit payer du twilight pool
            if (G.twilightPool < cost) {
                G.statusMessage = `Crépuscule insuffisant pour attacher ${card.title} (Requis: ${cost}, Dispo: ${G.twilightPool})`;
                return 'INVALID_MOVE';
            }
            G.twilightPool -= cost;
        }

        // 3. Retirer la carte de la main
        const [attachedCard] = player.hand.splice(cardIndex, 1);

        // 4. Attacher la carte au personnage
        if (!targetCharacter.attachments) {
            targetCharacter.attachments = [];
        }
        targetCharacter.attachments.push(attachedCard);

        const cardName = attachedCard.title || attachedCard.name || 'Une carte';
        const targetName =
            targetCharacter.title || targetCharacter.name || 'le personnage';
        G.statusMessage = `${cardName} a été attaché à ${targetName}.`;
    },

    // 🟢 JOUILLER UNE CARTE (DYNAMIQUE)
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

        // 1. Joueur Peuples Libres (FP)
        if (isFP) {
            if (card.kind !== 'FREE_PEOPLES') return 'INVALID_MOVE';

            const [playedCard] = player.hand.splice(cardIndex, 1);
            const cost = Number(playedCard.twilightCost) || 0;
            G.twilightPool += cost;

            if (playedCard.type === 'COMPANION' || playedCard.type === 'ALLY') {
                if (!player.fellowshipArea) player.fellowshipArea = [];
                player.fellowshipArea.push(playedCard);
            } else {
                if (!player.supportArea) player.supportArea = [];
                player.supportArea.push(playedCard);
            }

            G.statusMessage = `${card.title || card.name} a été joué dans la zone FP (+${cost} Crépuscule).`;
            return;
        }

        // 2. Joueur Ombre (SHADOW)
        if (!isFP) {
            if (card.kind !== 'SHADOW') return 'INVALID_MOVE';

            const cost = Number(card.twilightCost) || 0;
            if (G.twilightPool < cost) {
                G.statusMessage = `Crépuscule insuffisant pour jouer ${card.title} (Requis: ${cost}, Dispo: ${G.twilightPool})`;
                return 'INVALID_MOVE';
            }

            G.twilightPool -= cost;
            const [playedCard] = player.hand.splice(cardIndex, 1);

            if (playedCard.type === 'MINION') {
                if (!G.battlefield) G.battlefield = [];
                G.battlefield.push(playedCard);
            } else {
                if (!player.supportArea) player.supportArea = [];
                player.supportArea.push(playedCard);
            }

            G.statusMessage = `${card.title || card.name} a été joué par l'Ombre (-${cost} Crépuscule).`;
        }
    },

    // 🟢 FIN DE LA PHASE FELLOWSHIP
    endFellowshipPhase: ({ G, ctx, events, playerID }: LotrMoveContext) => {
        const fpId = G.fpPlayerId || '0';
        const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';

        if (actingPlayerId !== fpId) {
            console.warn(
                '❌ Seul le joueur FP peut terminer la phase Fellowship'
            );
            return 'INVALID_MOVE';
        }

        // Avance la compagnie (Calcul Twilight etc.)
        advanceCompany(G, ctx, actingPlayerId);

        // Si la sélection de site n'est pas bloquée, passage en phase Ombre
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
        { G, playerID }: LotrMoveContext,
        cardIndex: number
    ) => {
        const actingPlayerId = playerID ?? '0';
        const player = G.players?.[actingPlayerId];
        if (!player || !player.hand[cardIndex]) return 'INVALID_MOVE';

        const shadowPlayerId = G.fpPlayerId === '0' ? '1' : '0';
        const fpPlayerId = G.fpPlayerId || '0';

        if (
            G.regroupStep === 'SHADOW_REFILL' &&
            actingPlayerId !== shadowPlayerId
        )
            return 'INVALID_MOVE';
        if (G.regroupStep === 'FP_REFILL' && actingPlayerId !== fpPlayerId)
            return 'INVALID_MOVE';

        const [discarded] = player.hand.splice(cardIndex, 1);
        if (!player.discard) player.discard = [];
        player.discard.push(discarded);

        G.statusMessage = `${player.profile?.name || `Joueur ${actingPlayerId}`} a défaussé ${discarded.title || discarded.name}.`;
    },

    confirmHandRefill: ({ G, ctx, events, playerID }: LotrMoveContext) => {
        const actingPlayerId = playerID ?? '0';
        const player = G.players?.[actingPlayerId];
        if (!player) return 'INVALID_MOVE';

        if (!player.discard) player.discard = [];

        while (player.hand.length > 8) {
            const discarded = player.hand.pop();
            if (discarded) player.discard.push(discarded);
        }

        while (
            player.hand.length < 8 &&
            player.deck &&
            player.deck.length > 0
        ) {
            const drawnCard = player.deck.pop();
            if (drawnCard) player.hand.push(drawnCard);
        }

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
            console.log('🚀 [FIN DE TOUR] Switch de rôle FP / Ombre');

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
            G.pendingPhaseEnd = false;
            events?.endPhase?.();
        }
    },

    finishSkirmishResolution: ({ G, ctx, events }: LotrMoveContext) => {
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
            applyWoundToCard(G, targetCard, 1);
        }
    },

    devSetTwilight: ({ G }: LotrMoveContext, amount: number) => {
        G.twilightPool = Math.max(0, amount);
    },

    devSetPhase: ({ G, events }: LotrPhaseContext, targetPhase: string) => {
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
        if (events) {
            events.setActivePlayers?.({ value: { '0': 'play', '1': 'play' } });
            events.endPhase?.();
        }
    },

    devLoadPreset: ({ G }: LotrMoveContext, presetType: DevPresetType) => {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];

        if (presetType === 'ARCHERY_TEST' && fpPlayer) {
            G.twilightPool = 8;
            fpPlayer.fellowshipArea = [
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
                    vitality: 1,
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
            G.statusMessage = '[DEV] Preset Archerie chargé !';
        }
    },

    drawCard: ({ G, ctx, playerID }: LotrMoveContext) => {
        const targetId = getTargetPlayerId(playerID, ctx);
        const player = G.players[targetId];

        if (player?.deck && player.deck.length > 0) {
            const card = player.deck.shift();
            if (card) player.hand.push(card);
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
        { G, ctx, events, playerID }: LotrMoveContext,
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

            const fpId = G.fpPlayerId || '0';
            const fpPlayer = G.players[fpId];

            if (fpPlayer) {
                fpPlayer.currentSiteIndex = targetIndex;
            }

            const siteCost = Number(playedSite.twilightCost) || 0;
            const companionsCount = fpPlayer?.fellowshipArea
                ? fpPlayer.fellowshipArea.length
                : 0;
            G.twilightPool += siteCost + companionsCount;

            G.statusMessage = `Nouveau site révélé ! La compagnie avance en ${playedSite.name}. (+${siteCost + companionsCount} Crépuscule)`;

            if (ctx.phase === 'regroup') {
                G.skirmishes = [];
                G.activeSkirmishId = undefined;
                events?.setPhase?.('shadow');
            } else {
                G.pendingPhaseEnd = true;
            }
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

        G.statusMessage = `${attachmentTitle} est transféré de ${sourceTitle} vers ${targetTitle} (Coût : ${cost} Crépuscule).`;
    },
};
