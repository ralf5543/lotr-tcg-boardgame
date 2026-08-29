import type { LotrMoveContext, CardState } from '../types';
import { canTransferAid } from '../engine/validations/canTransferAid';
import { findTargetCard } from '../../utils/cardUtils';
import { hasActionableFollowers } from '../logic/aidHelpers';

export const transferAid = (
    { G, playerID }: LotrMoveContext,
    followerInstanceId: string,
    targetInstanceId: string
) => {

    const player = G.players?.[playerID];
    if (!player) {
        console.error(
            `[transferAid] ❌ Joueur introuvable pour ID : ${playerID}`
        );
        return 'INVALID_MOVE';
    }

    // 1. Recherche du Follower dans supportArea (par instanceId ou id)
    const followerIndex = player.supportArea.findIndex(
        (c) =>
            c.instanceId === followerInstanceId || c.id === followerInstanceId
    );

    if (followerIndex === -1) {
        console.error(
            `[transferAid] ❌ Follower ${followerInstanceId} non trouvé dans la supportArea du joueur ${playerID}`
        );
        return 'INVALID_MOVE';
    }

    const follower = player.supportArea[followerIndex];


    // 2. Recherche de la Cible
    const targetCard = findTargetCard(G, targetInstanceId);

    if (!targetCard) {
        console.error(
            `[transferAid] ❌ Cible ${targetInstanceId} introuvable sur le plateau.`
        );
        return 'INVALID_MOVE';
    }

    // 3. Validation
    const validation = canTransferAid(follower, targetCard, G, playerID);
    if (!validation.valid) {
        console.warn(
            `[transferAid] ⛔ Validation refusée : ${validation.reason}`
        );
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

    targetCard.attachments = [] as CardState[];
    targetCard.attachments.push(follower);

    const followerTitle =
        follower.i18n?.fr?.title || follower.title || 'le Suivant';
    const targetTitle =
        targetCard.i18n?.fr?.title || targetCard.title || 'le personnage';
    G.statusMessage = `${followerTitle} est attaché à ${targetTitle} (Aide).`;

    if (player) {
        const remainingActionable = hasActionableFollowers(player, G, playerID);

        if (!remainingActionable && G.aidState?.players?.[playerID]) {

            G.aidState.players[playerID].isDone = true;

            const fpId = G.fpPlayerId || '0';
            const shadowId = fpId === '0' ? '1' : '0';

            // Si les deux ont terminé l'étape Aide, on passe aux actions de Manœuvre
            if (
                G.aidState.players[fpId]?.isDone &&
                G.aidState.players[shadowId]?.isDone
            ) {

                G.maneuverStep = 'MANEUVER_ACTIONS';
                G.actionWindow = {
                    isOpen: true,
                    activePlayerId: fpId,
                    title: 'PHASE DE MANŒUVRE',
                    message:
                        'Voulez-vous jouer une carte / un effet de Manœuvre ou PASSER ?',
                    canPass: true,
                    passesCount: 0,
                };
                G.statusMessage = `${followerTitle} attaché à ${targetTitle}. Étape d'Aide terminée !`;
            }
        }
    }
};

export const confirmAid = ({ G, playerID }: LotrMoveContext) => {

    if (!G.aidState?.players?.[playerID]) {
        console.error(
            `[confirmAid] ❌ G.aidState.players[${playerID}] est indéfini ! G.aidState =`,
            G.aidState
        );
        return 'INVALID_MOVE';
    }

    G.aidState.players[playerID].isDone = true;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpDone = G.aidState.players[fpId]?.isDone;
    const shadowDone = G.aidState.players[shadowId]?.isDone;

    if (fpDone && shadowDone) {

        G.maneuverStep = 'MANEUVER_ACTIONS';
        G.actionWindow = {
            isOpen: true,
            activePlayerId: fpId,
            title: 'PHASE DE MANŒUVRE',
            message:
                'Voulez-vous jouer une carte / un effet de Manœuvre ou PASSER ?',
            canPass: true,
            passesCount: 0,
        };
        G.statusMessage = 'Manœuvre : Ouverture de la fenêtre d’action.';
    } else {
        G.statusMessage = `Joueur ${playerID} a terminé son étape d'Aide. En attente de l'adversaire...`;
    }
};

export const maneuverMoves = {
    transferAid,
    confirmAid,
};
