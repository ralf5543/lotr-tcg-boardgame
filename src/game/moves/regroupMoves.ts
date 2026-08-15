import type { LotrMoveContext } from '../types';
import { drawCardsForPlayer } from '../../utils/drawCards';
import { commonMoves } from './commonMoves';

export const endTurnChoice = ({ G }: LotrMoveContext) => {
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

    if (G.regroupStep === 'SHADOW_REFILL' && actingPlayerId !== shadowPlayerId) {
        console.warn('❌ [moves.discardCardFromHand] Ce n’est pas au tour de l’Ombre de défausser.');
        return 'INVALID_MOVE';
    }
    if (G.regroupStep === 'FP_REFILL' && actingPlayerId !== fpPlayerId) {
        console.warn('❌ [moves.discardCardFromHand] Ce n’est pas au tour de FP de défausser.');
        return 'INVALID_MOVE';
    }

    if (player.hand.length <= 8 && player.hasDiscardedInRegroup) {
        console.warn(`⚠️ [moves.discardCardFromHand] Le Joueur ${actingPlayerId} a déjà défaussé sa carte optionnelle.`);
        G.statusMessage = 'Vous avez déjà défaussé votre carte optionnelle pour ce tour.';
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
            nextFpPlayer.fellowshipArea = nextFpPlayer.fellowshipArea.map((card: any) => ({
                ...card,
                isFaceDown: false,
            }));
        }

        G.statusMessage = `Nouveau tour ! Le joueur ${nextFpPlayerId} devient les Peuples Libres.`;

        events?.endTurn?.({ next: nextFpPlayerId });
        events?.setPhase?.('fellowship');
    }
};

export const regroupMoves = {
    endTurnChoice,
    discardCardFromHand,
    confirmHandRefill,
};