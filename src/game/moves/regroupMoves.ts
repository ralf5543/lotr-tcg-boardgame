import type { LotrMoveContext, GameState } from '../types';
import { drawCardsForPlayer } from '../../utils/drawCards';
import { initStandardRegroup } from '..';

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

// 1. Défausse individuelle d'une carte au clic dans la main
export const discardForMuster = (
    context: LotrMoveContext,
    cardIndex: number
) => {
    const { G, ctx } = context;

    // 1. Récupération et normalisation de l'ID du joueur
    const playerID = context.playerID ?? ctx.playerID ?? ctx.currentPlayer;

    if (!playerID) {
        return 'INVALID_MOVE';
    }

    // 2. Vérification de la phase et de la sous-étape
    if (G.regroupStep !== 'MUSTER_STEP') {
        return 'INVALID_MOVE';
    }

    const player = G.players?.[playerID];
    const musterState = G.musterState?.players?.[playerID];

    // 3. Contrôles sur l'état du joueur et du Ralliement
    if (!player || !musterState) {
        return 'INVALID_MOVE';
    }

    if (musterState.isDone) {
        return 'INVALID_MOVE';
    }

    if (musterState.discardedCount >= musterState.allowedCount) {
        return 'INVALID_MOVE';
    }

    if (cardIndex < 0 || cardIndex >= player.hand.length) {
        return 'INVALID_MOVE';
    }

    // 4. Mutation de l'état (Défausse)
    const [discardedCard] = player.hand.splice(cardIndex, 1);

    if (discardedCard) {
        if (!player.discard) {
            player.discard = [];
        }
        player.discard.push(discardedCard);
        musterState.discardedCount += 1;
    }
};

// 2. Pioche groupée & validation au clic sur le bouton du Toaster
export const confirmMuster = (context: LotrMoveContext) => {
    const { G, ctx } = context;

    // 🟢 RÉSOLUTIONS STRICTES DU PLAYERID
    const playerID = context.playerID ?? ctx.playerID ?? ctx.currentPlayer;

    if (!playerID) {
        return 'INVALID_MOVE';
    }

    const player = G.players?.[playerID];
    const musterState = G.musterState?.players?.[playerID];

    if (!player || !musterState) {
        return 'INVALID_MOVE';
    }

    if (musterState.isDone) {
        return 'INVALID_MOVE';
    }

    // 1. Pioche groupée des cartes défaussées
    const countToDraw = musterState.discardedCount;

    for (let i = 0; i < countToDraw; i++) {
        if (player.deck.length > 0) {
            const drawnCard = player.deck.pop();
            if (drawnCard) {
                player.hand.push(drawnCard);
            }
        }
    }

    // 2. Marquer ce joueur comme terminé
    musterState.isDone = true;

    // 3. Fermer la fenêtre de Toaster globale/locale si besoin
    if (G.actionWindow) {
        G.actionWindow.isOpen = false;
    }

    // 4. Si tous les joueurs ont terminé leur ralliement, on passe à la suite
    const allPlayersDone = Object.values(G.musterState.players).every(
        (p) => p.isDone
    );

    if (allPlayersDone) {
        G.regroupStep = undefined;
        G.musterState = undefined;

        const fpId = G.fpPlayerId || '0';
        initStandardRegroup(G, fpId);
    }
};

export const regroupMoves = {
    endTurnChoice,
    discardCardFromHand,
    confirmHandRefill,
    discardForMuster,
    confirmMuster,
};
