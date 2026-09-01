import type { GameState, PlayerState, CardState } from '../types';
import { canTransferAid } from '../engine/validations/canTransferAid';
import { canUseAbility } from '../engine/canUseAbility';

export const hasActionableStartOfPhaseCards = (
    player: PlayerState,
    G: GameState,
    playerID: string,
    phaseName: string
): boolean => {
    if (!player) return false;

    let hasActionable = false;
    const context = { G, ctx: { phase: phaseName }, playerID };

    const fpId = G.fpPlayerId || '0';
    const isFP = playerID === fpId;

    // Tous les personnages en jeu susceptibles de recevoir un Suivant
    const allCharacters: CardState[] = [];
    Object.values(G.players || {}).forEach((p) => {
        if (p.fellowshipArea) allCharacters.push(...p.fellowshipArea);
    });
    if (G.battlefield) allCharacters.push(...G.battlefield);

    const evaluateCard = (
        card: CardState,
        belongsToPlayer: boolean,
        location: string
    ): boolean => {
        if (!belongsToPlayer) {
            card.isActionable = false;
            if (card.attachments) {
                card.attachments.forEach((att) => (att.isActionable = false));
            }
            return false;
        }

        let cardCanAct = false;

        // 1. Suivants (uniquement durant startOfManeuver et s'ils ne sont PAS déjà attachés)
        const isUnattachedFollower =
            (card.type === 'FOLLOWER' || Boolean(card.aidCost)) &&
            !card.attachedViaAid &&
            !card.attachedTo;

        if (phaseName === 'startOfManeuver' && isUnattachedFollower) {
            const canAttachToAny = allCharacters.some(
                (target) => canTransferAid(card, target, G, playerID).valid
            );
            if (canAttachToAny) {
                cardCanAct = true;
            }
        }

        // 2. Capacités de début de phase de la carte elle-même
        if (!cardCanAct && canUseAbility(card, context).valid) {
            cardCanAct = true;
        }

        card.isActionable = cardCanAct;

        // 3. Évaluation des attachements du personnage
        if (card.attachments && card.attachments.length > 0) {
            card.attachments.forEach((att) => {
                // Si la carte dans attachments est un Suivant ou un attachement d'Aide,
                // elle a déjà été attachée : elle ne peut plus agir en startOfManeuver.
                const isAidAttachment =
                    att.type === 'FOLLOWER' ||
                    Boolean(att.attachedViaAid) ||
                    Boolean(att.attachedTo);

                let attCanAct = false;

                // On ne teste canUseAbility sur un attachement que s'il ne s'agit pas
                // d'un Suivant déjà attaché
                if (!isAidAttachment) {
                    attCanAct = canUseAbility(att, context).valid;
                }

                att.isActionable = attCanAct;
                if (attCanAct) cardCanAct = true;
            });
        }

        return cardCanAct;
    };

    // 1. Support Area
    if (player.supportArea) {
        player.supportArea.forEach((card) => {
            if (evaluateCard(card, true, 'supportArea')) hasActionable = true;
        });
    }

    // 2. Fellowship Area
    if (player.fellowshipArea) {
        player.fellowshipArea.forEach((card) => {
            if (evaluateCard(card, true, 'fellowshipArea'))
                hasActionable = true;
        });
    }

    // 3. Battlefield
    if (G.battlefield) {
        G.battlefield.forEach((card) => {
            const cardBelongsToPlayer = isFP
                ? card.kind === 'FREE_PEOPLE'
                : card.kind === 'SHADOW';

            if (evaluateCard(card, cardBelongsToPlayer, 'battlefield'))
                hasActionable = true;
        });
    }

    return hasActionable;
};
