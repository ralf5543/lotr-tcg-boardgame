import type { LotrMoveContext } from '../types';
import { canTransferAid } from '../engine/validations/canTransferAid';
import { findTargetCard } from '../../utils/cardUtils';
import { hasActionableStartOfPhaseCards } from '../logic/hasActionableStartOfPhaseCards';

export const transferAid = (
    { G, ctx, events, playerID }: LotrMoveContext,
    followerInstanceId: string,
    targetInstanceId: string
) => {
    if (
        ctx.phase !== 'startOfManeuver' ||
        G.maneuverStep !== 'MANEUVER_START'
    ) {
        return 'INVALID_MOVE';
    }

    // 🟢 Utilisation de startOfPhaseState au lieu d'aidState
    if (G.startOfPhaseState?.players?.[playerID]?.isDone) {
        return 'INVALID_MOVE';
    }

    const player = G.players?.[playerID];
    if (!player) return 'INVALID_MOVE';

    const followerIndex = player.supportArea.findIndex(
        (c) =>
            c.instanceId === followerInstanceId || c.id === followerInstanceId
    );
    if (followerIndex === -1) return 'INVALID_MOVE';

    const follower = player.supportArea[followerIndex];
    const targetCard = findTargetCard(G, targetInstanceId);
    if (!targetCard) return 'INVALID_MOVE';

    const validation = canTransferAid(follower, targetCard, G, playerID);
    if (!validation.valid) {
        G.statusMessage = `Transfert Aid impossible : ${validation.reason}`;
        return 'INVALID_MOVE';
    }

    // Paiement du coût
    if (follower.aidCost) {
        const { type, amount } = follower.aidCost;
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];

        if (type === 'TWILIGHT') {
            if (playerID === fpId) {
                G.twilightPool = (G.twilightPool || 0) + amount;
            } else {
                G.twilightPool = Math.max(0, (G.twilightPool || 0) - amount);
            }
        } else if (type === 'THREAT') {
            if (fpPlayer) fpPlayer.threats = (fpPlayer.threats || 0) + amount;
        } else if (type === 'BURDEN') {
            if (fpPlayer) fpPlayer.burdens = (fpPlayer.burdens || 0) + amount;
        }
    }

    // Transfert
    player.supportArea.splice(followerIndex, 1);
    follower.attachedViaAid = true;
    follower.attachedTo = targetCard.id;

    if (!targetCard.attachments) {
        targetCard.attachments = [];
    }
    targetCard.attachments.push(follower);

    const followerTitle =
        follower.i18n?.fr?.title || follower.title || 'le Suivant';
    const targetTitle =
        targetCard.i18n?.fr?.title || targetCard.title || 'le personnage';
    G.statusMessage = `${followerTitle} est attaché à ${targetTitle}.`;

    // Vérification des cartes actionnables restantes
    const remainingActionable = hasActionableStartOfPhaseCards(
        player,
        G,
        playerID,
        'startOfManeuver'
    );

    if (!remainingActionable && G.startOfPhaseState?.players?.[playerID]) {
        G.startOfPhaseState.players[playerID].isDone = true;
    }

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpDone =
        G.startOfPhaseState?.players?.[fpId]?.isDone ||
        !hasActionableStartOfPhaseCards(
            G.players[fpId],
            G,
            fpId,
            'startOfManeuver'
        );

    const shadowDone =
        G.startOfPhaseState?.players?.[shadowId]?.isDone ||
        !hasActionableStartOfPhaseCards(
            G.players[shadowId],
            G,
            shadowId,
            'startOfManeuver'
        );

    if (fpDone && shadowDone) {
        G.startOfPhaseState = undefined;
        events?.setPhase?.('maneuver');
    }
};

export const maneuverMoves = {
    transferAid,
};
