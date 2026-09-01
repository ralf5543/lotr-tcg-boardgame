// src/game/engine/moves/regroupMoves.ts

import type { LotrMoveContext } from '../types';
import { drawCardsForPlayer } from '../../utils/drawCards';
import type { GameState } from '../types';

// Helper pour renvoyer les Suivants en zone de support à la vraie fin de tour
export const returnAidFollowersToSupport = (G: GameState) => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = Object.keys(G.players).find((id) => id !== fpId) || '1';

    const processCharacter = (character: any) => {
        if (!character.attachments || character.attachments.length === 0)
            return;

        const remainingAttachments: any[] = [];

        character.attachments.forEach((att: any) => {
            if (att.attachedViaAid) {
                // 1. Nettoyage complet des marqueurs d'attachement
                delete att.attachedViaAid;
                delete att.attachedTo;
                delete att.isAttached;
                delete att.$isAttachment;

                // 2. Identification du propriétaire
                const targetOwnerId =
                    att.kind === 'FREE_PEOPLE' ? fpId : shadowId;
                const owner = G.players[targetOwnerId];

                if (owner) {
                    if (!owner.supportArea) {
                        owner.supportArea = [];
                    }
                    // 3. Injection explicite dans la supportArea
                    owner.supportArea = [...owner.supportArea, att];
                }
            } else {
                remainingAttachments.push(att);
            }
        });

        character.attachments = remainingAttachments;
    };

    // Parcourir toute la Compagnie + le champ de bataille
    Object.values(G.players).forEach((player: any) => {
        player.fellowshipArea?.forEach(processCharacter);
    });
    G.battlefield?.forEach(processCharacter);
};

export const endTurnChoice = ({ G }: LotrMoveContext) => {
    // 🟢 Renvoyer les Suivants en support-area seulement quand le FP choisit de finir son tour
    returnAidFollowersToSupport(G);

    G.regroupStep = 'FP_REFILL';
    G.statusMessage =
        'Peuples Libres : Ajustez votre main à 8 cartes et validez pour terminer le tour.';
};

export const discardCardFromHand = (
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
        confirmHandRefill({ G, events, playerID } as LotrMoveContext);
    }
};

export const confirmHandRefill = ({ G, events, playerID }: LotrMoveContext) => {
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
            (G.battlefield || []).forEach((minion: any) => {
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

        const nextFpPlayer = G.players[nextFpPlayerId];

        if (nextFpPlayer?.fellowshipArea) {
            nextFpPlayer.fellowshipArea = nextFpPlayer.fellowshipArea.map(
                (card: any) => ({
                    ...card,
                    isFaceDown: false,
                })
            );
        }

        G.statusMessage = `Nouveau tour ! Le joueur ${nextFpPlayerId} devient les Peuples Libres.`;

        events?.endTurn?.({ next: nextFpPlayerId });
        events?.setPhase?.('fellowship');
    }
};

// 1. Défausse individuelle d'une carte au clic dans la main pendant le Ralliement (Muster)
export const discardForMuster = (
    context: LotrMoveContext,
    cardIndex: number
) => {
    const { G, ctx } = context;
    const playerID = context.playerID ?? ctx.currentPlayer;

    if (!playerID) return 'INVALID_MOVE';

    // Tolère MUSTER_STEP et START_OF_REGROUP
    if (
        G.regroupStep !== 'MUSTER_STEP' &&
        G.regroupStep !== 'START_OF_REGROUP'
    ) {
        return 'INVALID_MOVE';
    }

    const player = G.players?.[playerID];
    const musterState = G.musterState?.players?.[playerID];

    if (!player || !musterState || musterState.isDone) return 'INVALID_MOVE';
    if (musterState.discardedCount >= musterState.allowedCount) {
        return 'INVALID_MOVE';
    }
    if (cardIndex < 0 || cardIndex >= player.hand.length) return 'INVALID_MOVE';

    // Clic en main = Défausse pour le Ralliement
    const [discardedCard] = player.hand.splice(cardIndex, 1);
    if (discardedCard) {
        if (!player.discard) player.discard = [];
        player.discard.push(discardedCard);
        musterState.discardedCount += 1;
        G.statusMessage = `Ralliement (${musterState.discardedCount}/${musterState.allowedCount}) : Carte défaussée.`;
    }
};

// 2. Confirmation ou passage du Ralliement (Piocher les cartes & avancer le tour)
export const confirmMuster = ({
    G,
    ctx,
    events,
    playerID,
}: LotrMoveContext) => {
    const pId = String(playerID ?? ctx.currentPlayer);

    if (!G.musterState?.players?.[pId]) {
        console.error(
            '   └─ ❌ REJET : musterState introuvable pour ce joueur !'
        );
        return 'INVALID_MOVE';
    }

    const playerMuster = G.musterState.players[pId];
    if (playerMuster.isDone) {
        console.warn(
            '   └─ ⚠️ REJET : Le joueur a déjà validé son ralliement.'
        );
        return 'INVALID_MOVE';
    }

    const player = G.players?.[pId];
    if (player && playerMuster.discardedCount > 0) {
        drawCardsForPlayer(G, player, playerMuster.discardedCount, false);
    }

    playerMuster.isDone = true;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    const fpDone = G.musterState.players[fpId]?.isDone ?? true;
    const shadowDone = G.musterState.players[shadowId]?.isDone ?? true;

    if (!fpDone || !shadowDone) {
        G.statusMessage = `Joueur ${pId} a validé. En attente de l'adversaire...`;
        return;
    }

    G.musterState = undefined;
    events?.setPhase?.('regroup');
};

export const regroupMoves = {
    endTurnChoice,
    discardCardFromHand,
    confirmHandRefill,
    discardForMuster,
    confirmMuster,
};
