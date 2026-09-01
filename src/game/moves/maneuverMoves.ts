import type { LotrMoveContext } from '../types';
import { canTransferAid } from '../engine/validations/canTransferAid';
import { findTargetCard } from '../../utils/cardUtils';
import { hasActionableStartOfManeuverCards } from '../logic/hasActionableStartOfManeuverCards';

export const transferAid = (
    { G, ctx, events, playerID }: LotrMoveContext,
    followerInstanceId: string,
    targetInstanceId: string
) => {
    // 1. Garde : Doit obligatoirement être en startOfManeuver + MANEUVER_START
    if (
        ctx.phase !== 'startOfManeuver' ||
        G.maneuverStep !== 'MANEUVER_START'
    ) {
        console.error(
            `   └─ ❌ REJET : transferAid autorisé uniquement durant "startOfManeuver" + "MANEUVER_START" (Actuel: phase="${ctx.phase}", step="${G.maneuverStep}")`
        );
        return 'INVALID_MOVE';
    }

    // 🛑 2. Garde : Le joueur ne doit pas avoir déjà validé
    if (G.aidState?.players?.[playerID]?.isDone) {
        console.error(
            `   └─ ❌ REJET : Le Joueur "${playerID}" a déjà validé son étape d'Aide.`
        );
        return 'INVALID_MOVE';
    }

    const player = G.players?.[playerID];
    if (!player) {
        console.error(`   └─ ❌ Joueur introuvable pour ID : ${playerID}`);
        return 'INVALID_MOVE';
    }

    // 1. Recherche du Follower dans supportArea
    const followerIndex = player.supportArea.findIndex(
        (c) =>
            c.instanceId === followerInstanceId || c.id === followerInstanceId
    );

    if (followerIndex === -1) {
        console.error(
            `   └─ ❌ Follower ${followerInstanceId} non trouvé dans la supportArea du joueur ${playerID}`
        );
        return 'INVALID_MOVE';
    }

    const follower = player.supportArea[followerIndex];

    // 2. Recherche de la Cible
    const targetCard = findTargetCard(G, targetInstanceId);

    if (!targetCard) {
        console.error(
            `   └─ ❌ Cible ${targetInstanceId} introuvable sur le plateau.`
        );
        return 'INVALID_MOVE';
    }

    // 3. Validation
    const validation = canTransferAid(follower, targetCard, G, playerID);
    if (!validation.valid) {
        console.warn(`   └─ ⛔ Validation refusée : ${validation.reason}`);
        G.statusMessage = `Transfert Aid impossible : ${validation.reason}`;
        return 'INVALID_MOVE';
    }

    // 4. Paiement du coût
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

    // 5. Transfert
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
    G.statusMessage = `${followerTitle} est attaché à ${targetTitle} (Aide).`;

    // 6. Vérifier s'il reste des cartes actionnables pour ce joueur
    const remainingActionable = hasActionableStartOfManeuverCards(
        player,
        G,
        playerID
    );

    if (!remainingActionable && G.aidState?.players?.[playerID]) {
        G.aidState.players[playerID].isDone = true;
    }

    // 7. Vérification globale : transition si aucun des deux n'a d'actions en attente
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpDone =
        G.aidState?.players?.[fpId]?.isDone ||
        !hasActionableStartOfManeuverCards(G.players[fpId], G, fpId);

    const shadowDone =
        G.aidState?.players?.[shadowId]?.isDone ||
        !hasActionableStartOfManeuverCards(G.players[shadowId], G, shadowId);

    if (fpDone && shadowDone) {
        console.log(
            '   └─ 🎉 Aucune action "Début de manœuvre" restante. Transition automatique vers "maneuver"...'
        );
        G.aidState = undefined;
        events?.setPhase?.('maneuver');
    }
};

export const confirmAid = ({ G, ctx, events, playerID }: LotrMoveContext) => {
    if (
        ctx.phase !== 'startOfManeuver' ||
        G.maneuverStep !== 'MANEUVER_START'
    ) {
        return 'INVALID_MOVE';
    }

    if (!G.aidState?.players?.[playerID]) {
        console.error(
            `   └─ ❌ G.aidState.players[${playerID}] est indéfini !`
        );
        return 'INVALID_MOVE';
    }

    G.aidState.players[playerID].isDone = true;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpDone = G.aidState.players[fpId]?.isDone;
    const shadowDone = G.aidState.players[shadowId]?.isDone;

    if (fpDone && shadowDone) {
        G.aidState = undefined;
        events?.setPhase?.('maneuver');
    } else {
        G.statusMessage = `Joueur ${playerID} a terminé son étape d'Aide. En attente de l'adversaire...`;
    }
};

export const maneuverMoves = {
    transferAid,
    confirmAid,
};
