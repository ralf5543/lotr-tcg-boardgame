import type { Ctx } from 'boardgame.io';
import type { GameState, LotrMoveContext, LotrPhaseContext } from './types';
import { resolveSkirmish, applyWoundToCard } from './skirmish';
import { drawCardsForPlayer } from '../utils/drawCards';
import { applyDevPreset } from './dev/presets';
import { advanceArcheryAssignmentStep } from './index';
import { applyWoundAndCheckDeath } from '../utils/applyWoundAndCheckDeath';
import { getEffectiveVitality, getMaxVitality } from '../utils/cardStats';
import type { CardState } from './types';

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
        console.warn(
            "⚠️ [moves.advanceCompany] Index >= 9, impossible d'avancer."
        );
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
        console.warn(
            '⚠️ [moves.passActionWindow] Aucune fenêtre d’action ouverte.'
        );
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
            advanceArcheryAssignmentStep(G, events);
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

    // 🔓 REVELE UN COMPAGNON SPECIFIQUE DANS LA FELLOWSHIP AREA
    revealCompanion: (
        { G, playerID }: LotrMoveContext,
        companionId: string
    ) => {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];

        if (!fpPlayer || !fpPlayer.fellowshipArea) {
            console.warn(
                '❌ [moves.revealCompanion] Zone de communauté introuvable.'
            );
            return 'INVALID_MOVE';
        }

        let found = false;
        fpPlayer.fellowshipArea = fpPlayer.fellowshipArea.map((card) => {
            const isTarget =
                card.id === companionId ||
                (card as any).instanceId === companionId;
            if (isTarget) {
                found = true;
                return {
                    ...card,
                    isFaceDown: false,
                };
            }
            return card;
        });

        if (!found) {
            console.warn(
                `⚠️ [moves.revealCompanion] Aucune carte ne correspond à l'ID ${companionId}`
            );
            return 'INVALID_MOVE';
        }

        G.statusMessage = `Une carte de la Communauté a été révélée !`;
    },

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

        const fpPlayer = G.players[fpId];
        const allPossibleTargets = [
            ...(fpPlayer?.fellowshipArea || []),
            ...(fpPlayer?.supportArea || []),
            ...(player.supportArea || []),
            ...(G.battlefield || []),
        ];

        const targetCharacter = allPossibleTargets.find(
            (c: any) =>
                c.id === targetId ||
                c.instanceId === targetId ||
                c.uuid === targetId
        );

        if (!targetCharacter) {
            console.warn(
                `❌ [moves.attachCard] Cible ${targetId} introuvable parmi :`,
                allPossibleTargets.map((c: any) => ({
                    id: c.id,
                    instanceId: c.instanceId,
                    title: c.title,
                }))
            );
            return 'INVALID_MOVE';
        }

        const cost = Number(card.twilightCost) || 0;

        if (isFP) {
            if (card.kind !== 'FREE_PEOPLE') return 'INVALID_MOVE';
            G.twilightPool += cost;
        } else {
            if (card.kind !== 'SHADOW') return 'INVALID_MOVE';
            if (G.twilightPool < cost) {
                console.warn(
                    `❌ [moves.attachCard] Crépuscule insuffisant (${G.twilightPool}/${cost}).`
                );
                G.statusMessage = `Crépuscule insuffisant pour attacher ${card.title} (Requis: ${cost}, Dispo: ${G.twilightPool})`;
                return 'INVALID_MOVE';
            }
            G.twilightPool -= cost;
        }

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

        if (isFP) {
            if (card.kind !== 'FREE_PEOPLE') return 'INVALID_MOVE';

            const cost = Number(card.twilightCost) || 0;
            const [playedCard] = player.hand.splice(cardIndex, 1);
            G.twilightPool += cost;

            if (playedCard.type === 'COMPANION') {
                if (!player.fellowshipArea) player.fellowshipArea = [];
                // Un compagnon joué en cours de partie entre généralement face visible
                playedCard.isFaceDown = false;
                player.fellowshipArea.push(playedCard);
                G.statusMessage = `${playedCard.title} rejoint la Communauté (+${cost} Crépuscule).`;
            } else if (
                playedCard.type === 'ALLY' ||
                playedCard.type === 'FOLLOWER' ||
                playedCard.type === 'ARTIFACT' ||
                playedCard.type === 'CONDITION' ||
                playedCard.type === 'POSSESSION'
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

        if (!isFP) {
            if (card.kind !== 'SHADOW') return 'INVALID_MOVE';

            const cost = Number(card.twilightCost) || 0;
            if (G.twilightPool < cost) {
                console.warn(
                    `❌ [moves.playCard] Crépuscule insuffisant pour Ombre (${G.twilightPool}/${cost})`
                );
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
                playedCard.type === 'ARTIFACT' ||
                playedCard.type === 'CONDITION' ||
                playedCard.type === 'POSSESSION'
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

        if (
            G.regroupStep === 'SHADOW_REFILL' &&
            actingPlayerId !== shadowPlayerId
        ) {
            console.warn(
                '❌ [moves.discardCardFromHand] Ce n’est pas au tour de l’Ombre de défausser.'
            );
            return 'INVALID_MOVE';
        }
        if (G.regroupStep === 'FP_REFILL' && actingPlayerId !== fpPlayerId) {
            console.warn(
                '❌ [moves.discardCardFromHand] Ce n’est pas au tour de FP de défausser.'
            );
            return 'INVALID_MOVE';
        }

        if (player.hand.length <= 8 && player.hasDiscardedInRegroup) {
            console.warn(
                `⚠️ [moves.discardCardFromHand] Le Joueur ${actingPlayerId} a déjà défaussé sa carte optionnelle.`
            );
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
            commonMoves.confirmHandRefill({
                G,
                events,
                playerID,
            } as LotrMoveContext);
        }
    },

    submitMulliganChoice: (
        { G, events, playerID }: LotrMoveContext,
        doMulligan: boolean
    ) => {
        // Sécurité : uniquement pendant l'étape de Mulligan
        if (!G.setupState || G.setupState.step !== 'MULLIGAN') {
            console.warn(
                '⚠️ [moves.submitMulliganChoice] Action rejetée : Hors phase de mulligan.'
            );
            return 'INVALID_MOVE';
        }

        const pId = String(playerID ?? '0');
        const player = G.players?.[pId];
        if (!player) return 'INVALID_MOVE';

        // Empêcher de re-soumettre si le joueur a déjà fait son choix
        if (G.setupState.mulligans?.[pId] !== null) {
            console.warn(
                `⚠️ [moves.submitMulliganChoice] Le joueur ${pId} a déjà choisi.`
            );
            return 'INVALID_MOVE';
        }

        G.setupState.mulligans[pId] = doMulligan;

        if (doMulligan) {
            // 1. Remettre la main dans le deck
            player.deck.push(...player.hand);
            player.hand = [];

            // 2. Repiocher 8 cartes
            drawCardsForPlayer(G, player, 8, false);
        } else {
            console.log(
                `✅ [moves.submitMulliganChoice] Le joueur ${pId} conserve sa main.`
            );
        }

        const m0 = G.setupState.mulligans['0'];
        const m1 = G.setupState.mulligans['1'];

        // Si les deux joueurs ont validé leur décision
        if (m0 !== null && m1 !== null) {
            G.setupState.step = 'COMPLETE';
            G.statusMessage = 'Mise en place terminée ! Début de la partie.';

            if (events?.setPhase) {
                events.setPhase('fellowship');
            }
        } else {
            G.statusMessage = `Le joueur ${pId} a validé sa main. En attente de l'adversaire...`;
        }
    },

    confirmHandRefill: ({ G, events, playerID }: LotrMoveContext) => {
        const actingPlayerId = playerID ?? '0';
        const player = G.players?.[actingPlayerId];
        if (!player) return 'INVALID_MOVE';

        if (!player.discard) player.discard = [];

        while (player.hand.length > 8) {
            const discarded = player.hand.pop();
            if (discarded) player.discard.push(discarded);
        }

        if (player.hand.length < 8) {
            const needed = 8 - player.hand.length;
            drawCardsForPlayer(G, player, needed, false);
        }

        player.hasDiscardedInRegroup = false;

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
            const shadowId = G.fpPlayerId === '0' ? '1' : '0';
            const shadowPlayer = G.players[shadowId];

            if (shadowPlayer) {
                if (!shadowPlayer.discard) shadowPlayer.discard = [];
                (G.battlefield || []).forEach((minion) => {
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

            // 🔓 REVELATION AUTOMATIQUE DES COMPAGNONS DE LA COMMUNAUTE POUR LE NOUVEAU JOUEUR FP
            const nextFpPlayer = G.players[nextFpPlayerId];

            if (nextFpPlayer?.fellowshipArea) {
                nextFpPlayer.fellowshipArea = nextFpPlayer.fellowshipArea.map(
                    (card) => ({
                        ...card,
                        isFaceDown: false,
                    })
                );
            }

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

    cleanupPendingDeaths: ({ G }: LotrMoveContext) => {
        const fpId = G.fpPlayerId || '0';
        const shadowId = fpId === '0' ? '1' : '0';

        // 1. Nettoyage des Compagnons (morts -> deadPile)
        const fpPlayer = G.players[fpId];
        if (fpPlayer?.fellowshipArea) {
            fpPlayer.fellowshipArea = fpPlayer.fellowshipArea.filter(
                (c: any) => {
                    const remainingVitality = getEffectiveVitality(c);
                    const dead = c.isDead || remainingVitality <= 0;
                    if (dead) {
                        if (!fpPlayer.deadPile) fpPlayer.deadPile = [];
                        fpPlayer.deadPile.push(c);
                    }
                    return !dead;
                }
            );
        }

        // 2. Nettoyage des Séides (morts -> discard)
        G.battlefield = (G.battlefield || []).filter((c: any) => {
            const remainingVitality = getEffectiveVitality(c);
            const dead = c.isDead || remainingVitality <= 0;
            if (dead) {
                const shadowPlayer = G.players[shadowId];
                if (shadowPlayer) {
                    if (!shadowPlayer.discard) shadowPlayer.discard = [];
                    shadowPlayer.discard.push(c);
                }
            }
            return !dead;
        });

        // 3. Réinitialisation des états de combat / animations
        if (G.activeSkirmishId) {
            const skirmishIndex = G.skirmishes.findIndex(
                (s) => s.id === G.activeSkirmishId
            );
            if (skirmishIndex !== -1) {
                G.skirmishes.splice(skirmishIndex, 1);
            }
            G.activeSkirmishId = undefined;
        }
        G.pendingDeadCardIds = [];
        G.lastWoundedCardIds = [];
    },

    // 🏹 ASSIGNATION DES BLESSURES D'ARCHERIE
    assignArcheryWound: (
        { G, ctx, events, playerID }: LotrMoveContext,
        targetCardId: string
    ) => {
        const fpId = G.fpPlayerId || '0';
        const shadowId = fpId === '0' ? '1' : '0';

        const assignStep = G.archeryAssignStep || G.archeryState?.step;
        if (!assignStep) return 'INVALID_MOVE';

        const getLivingCompanions = () => {
            const fpPlayer = G.players[fpId];
            return (fpPlayer?.fellowshipArea || []).filter(
                (c: CardState) => !c.isDead && getEffectiveVitality(c) > 0
            );
        };

        const getLivingMinions = () => {
            return (G.battlefield || []).filter(
                (c: CardState) => !c.isDead && getEffectiveVitality(c) > 0
            );
        };

        // --- 1. ASSIGNATION PAR LE JOUEUR FP ---
        if (assignStep === 'FP' || assignStep === 'FP_ASSIGN') {
            if (playerID !== fpId) return 'INVALID_MOVE';

            const fpPlayer = G.players[fpId];
            const companion = fpPlayer?.fellowshipArea?.find(
                (c: CardState) =>
                    c.id === targetCardId || c.instanceId === targetCardId
            );

            // Anti-double-clic : On rejette si la carte n'existe pas, est déjà morte ou n'a plus de PV
            if (
                !companion ||
                companion.isDead ||
                getEffectiveVitality(companion) <= 0
            ) {
                return 'INVALID_MOVE';
            }

            // Infliger la blessure (applyWoundAndCheckDeath gère isDead et pendingDeadCardIds)
            applyWoundAndCheckDeath(G, companion, 1);

            // Décrémenter les compteurs
            if (G.archeryWoundsToAssign !== undefined)
                G.archeryWoundsToAssign -= 1;
            if (G.archeryState?.fpRemainingWounds !== undefined)
                G.archeryState.fpRemainingWounds -= 1;

            const remainingWounds =
                G.archeryState?.fpRemainingWounds ??
                G.archeryWoundsToAssign ??
                0;
            const remainingCompanions = getLivingCompanions();

            if (remainingWounds <= 0 || remainingCompanions.length === 0) {
                const shadowWoundsToAssign = G.archeryState?.fpTotal ?? 0;
                const livingMinions = getLivingMinions();

                if (shadowWoundsToAssign > 0 && livingMinions.length > 0) {
                    G.archeryAssignStep = 'SHADOW';
                    G.archeryWoundsToAssign = shadowWoundsToAssign;

                    if (G.archeryState) {
                        G.archeryState.step = 'SHADOW_ASSIGN';
                        G.archeryState.shadowRemainingWounds =
                            shadowWoundsToAssign;
                        G.archeryState.fpRemainingWounds = 0;
                    }

                    G.statusMessage = `Ombre : Assignez ${shadowWoundsToAssign} blessure(s) d'archerie à vos séides.`;
                } else {
                    G.archeryAssignStep = undefined;
                    if (G.archeryState) G.archeryState.step = 'COMPLETE';

                    G.pendingPhaseEnd = true;
                    G.nextPhase =
                        livingMinions.length === 0 ? 'regroup' : 'assignment';
                    G.statusMessage =
                        livingMinions.length === 0
                            ? 'Plus aucun séide sur le plateau ! Passage au Regroupement.'
                            : 'Phase d’Archerie terminée. Passage à l’Assignation.';
                }
            } else {
                G.statusMessage = `FP : Assignez encore ${remainingWounds} blessure(s).`;
            }
            return;
        }

        // --- 2. ASSIGNATION PAR LE JOUEUR OMBRE ---
        if (assignStep === 'SHADOW' || assignStep === 'SHADOW_ASSIGN') {
            if (playerID !== shadowId) return 'INVALID_MOVE';

            const minion = (G.battlefield || []).find(
                (c: CardState) =>
                    c.id === targetCardId || c.instanceId === targetCardId
            );

            // Anti-double-clic : On rejette si le séide n'existe pas, est déjà mort ou n'a plus de PV
            if (!minion || minion.isDead || getEffectiveVitality(minion) <= 0) {
                return 'INVALID_MOVE';
            }

            // Infliger la blessure (applyWoundAndCheckDeath gère isDead et pendingDeadCardIds)
            applyWoundAndCheckDeath(G, minion, 1);

            // Décrémenter les compteurs
            if (G.archeryWoundsToAssign !== undefined)
                G.archeryWoundsToAssign -= 1;
            if (G.archeryState?.shadowRemainingWounds !== undefined)
                G.archeryState.shadowRemainingWounds -= 1;

            const remainingWounds =
                G.archeryState?.shadowRemainingWounds ??
                G.archeryWoundsToAssign ??
                0;
            const remainingMinions = getLivingMinions();

            if (remainingWounds <= 0 || remainingMinions.length === 0) {
                G.archeryAssignStep = undefined;
                if (G.archeryState) G.archeryState.step = 'COMPLETE';

                G.pendingPhaseEnd = true;
                G.nextPhase =
                    remainingMinions.length === 0 ? 'regroup' : 'assignment';
                G.statusMessage =
                    remainingMinions.length === 0
                        ? 'Tous les séides ont été éliminés ! Passage au Regroupement.'
                        : 'Phase d’Archerie terminée. Passage à l’Assignation.';
            } else {
                G.statusMessage = `Ombre : Assignez encore ${remainingWounds} blessure(s).`;
            }
        }
    },

    applyWound: ({ G }: LotrMoveContext, targetCardId: string) => {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];

        const companion = fpPlayer?.fellowshipArea?.find(
            (c) => c.id === targetCardId
        );
        const minion = (G.battlefield || []).find((c) => c.id === targetCardId);
        const targetCard = companion || minion;

        if (targetCard) {
            applyWoundToCard(G, targetCard, 1);
        }
    },

    devSetTwilight: ({ G }: LotrMoveContext, amount: number) => {
        G.twilightPool = Math.max(0, amount);
    },

    devSetBurdens: ({ G }: LotrMoveContext, deltaOrAmount: number) => {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];
        if (!fpPlayer) return;

        // Si on passe une petite valeur (+1/-1), c'est un delta. Sinon c'est une valeur absolue.
        if (Math.abs(deltaOrAmount) === 1) {
            fpPlayer.burdens = Math.max(0, fpPlayer.burdens + deltaOrAmount);
        } else {
            fpPlayer.burdens = Math.max(0, deltaOrAmount);
        }
        G.statusMessage = `[DEV] Burdens ajustés à ${fpPlayer.burdens}.`;
    },

    devSetArchery: ({ G }: LotrMoveContext, amount: number) => {
        const targetAmount = Math.max(0, amount);

        G.archeryWoundsToAssign = targetAmount;

        if (G.archeryState) {
            G.archeryState.fpTotal = targetAmount;
            G.archeryState.shadowTotal = targetAmount;

            if (
                G.archeryAssignStep === 'FP' ||
                G.archeryState.step === 'FP_ASSIGN'
            ) {
                G.archeryState.fpRemainingWounds = targetAmount;
            } else if (
                G.archeryAssignStep === 'SHADOW' ||
                G.archeryState.step === 'SHADOW_ASSIGN'
            ) {
                G.archeryState.shadowRemainingWounds = targetAmount;
            }
        }
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
        applyDevPreset(G, presetType);
    },

    drawCard: ({ G, ctx, playerID }: LotrMoveContext, count: number = 1) => {
        const targetId = getTargetPlayerId(playerID, ctx);
        const player = G.players[targetId];
        if (!player) return 'INVALID_MOVE';

        const isFellowship = ctx.phase === 'fellowship';
        const drawn = drawCardsForPlayer(G, player, count, isFellowship);

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

        const isFirstSite = targetIndex === 0;
        const expectedPlayerId = isFirstSite ? fpId : shadowId;

        if (playerID !== expectedPlayerId) {
            console.warn(
                `❌ [moves.playSite] Rejet : C'est au joueur ${expectedPlayerId} (${isFirstSite ? 'FP' : 'Ombre'}) de poser le site ${targetIndex + 1}.`
            );
            return 'INVALID_MOVE';
        }

        const player = G.players[playerID];
        if (!player || !player.sitesDeck) return 'INVALID_MOVE';

        const siteIndex = player.sitesDeck.findIndex((s) => s.id === siteId);
        if (siteIndex === -1) {
            console.warn(
                `❌ [moves.playSite] Site ${siteId} introuvable dans le deck de sites de l'Ombre.`
            );
            return 'INVALID_MOVE';
        }

        const nextEmptyIndex = G.path.findIndex((slot) => slot === null);
        if (targetIndex !== nextEmptyIndex) {
            console.warn(
                `❌ [moves.playSite] Index cible ${targetIndex} ne correspond pas au prochain emplacement vide ${nextEmptyIndex}.`
            );
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

        // 1. Placement du site et mise à jour de la position FP
        player.sitesDeck.splice(siteIndex, 1);
        playedSite.ownerId = playerID;
        G.path[targetIndex] = playedSite;

        G.awaitingSiteSelection = false;
        const fpPlayer = G.players[fpId];

        if (fpPlayer) {
            fpPlayer.currentSiteIndex = targetIndex;
        }

        // 2. Calcul du crépuscule
        const siteCost = Number(playedSite.twilightCost) || 0;
        const companionsCount = fpPlayer?.fellowshipArea
            ? fpPlayer.fellowshipArea.length
            : 0;
        const addedTwilight = siteCost + companionsCount;
        G.twilightPool += addedTwilight;

        // 3. RÉVÉLATION PERMANENTE DES COMPAGNONS DE TOUS LES JOUEURS

        Object.keys(G.players).forEach((pId) => {
            const p = G.players[pId];
            if (p && p.fellowshipArea) {
                p.fellowshipArea = p.fellowshipArea.map((card) => ({
                    ...card,
                    isFaceDown: false,
                }));
            }
            G.awaitingSiteSelection = false;
        });

        G.statusMessage = `Nouveau site révélé ! La compagnie avance en ${playedSite.name} (+${addedTwilight} Crépuscule). Révélation des compagnons.`;

        // 4. TRANSITION DE PHASE
        // Si on a posé un site pour avancer...
        if (ctx.phase === 'fellowship') {
            // 🟢 Mouvement initial en Fellowship -> On enchaîne sur la phase Shadow
            if (events?.setPhase) {
                events.setPhase('shadow');
            }
        } else if (ctx.phase === 'regroup') {
            // 🟢 Mouvement supplémentaire depuis le Regroupement -> On ré-enchaîne aussi sur une phase Shadow !
            // Nettoyage des combats du mouvement précédent
            G.skirmishes = [];
            G.activeSkirmishId = undefined;

            if (events?.setPhase) {
                events.setPhase('shadow');
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
