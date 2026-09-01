import type { GameState, PlayerState, CardState } from '../types';
import { canTransferAid } from '../engine/validations/canTransferAid';
import { canUseAbility } from '../engine/canUseAbility';

/**
 * Parcourt les cartes en jeu du joueur et détermine s'il peut effectuer
 * une action durant la sous-étape "startOfManeuver" (Followers ou Capacités Début de Manœuvre).
 * Met à jour le drapeau `isActionable` sur l'ensemble des cartes en jeu.
 */
export const hasActionableStartOfManeuverCards = (
    player: PlayerState,
    G: GameState,
    playerID: string
): boolean => {
    if (!player) return false;

    let hasActionable = false;
    const context = { G, ctx: { phase: 'startOfManeuver' }, playerID };

    // Tous les personnages en jeu susceptibles de recevoir un Follower
    const allCharacters: CardState[] = [];
    Object.values(G.players || {}).forEach((p) => {
        if (p.fellowshipArea) allCharacters.push(...p.fellowshipArea);
    });
    if (G.battlefield) allCharacters.push(...G.battlefield);

    const evaluateCard = (card: CardState): boolean => {
        let cardCanAct = false;

        // 1. Suivant / Follower transférable
        if (card.type === 'FOLLOWER' || card.aidCost) {
            const canAttachToAny = allCharacters.some(
                (target) => canTransferAid(card, target, G, playerID).valid
            );
            if (canAttachToAny) cardCanAct = true;
        }

        // 2. Capacité Début de Manœuvre
        if (!cardCanAct && canUseAbility(card, context).valid) {
            cardCanAct = true;
        }

        // Mutation de l'état
        card.isActionable = cardCanAct;

        // Traitement des attachements éventuels sur cette carte
        if (card.attachments && card.attachments.length > 0) {
            card.attachments.forEach((att) => {
                const attCanAct = canUseAbility(att, context).valid;
                att.isActionable = attCanAct;
                if (attCanAct) cardCanAct = true;
            });
        }

        return cardCanAct;
    };

    // Parcours et marquage explicite des zones du joueur
    if (player.supportArea) {
        player.supportArea.forEach((card) => {
            if (evaluateCard(card)) hasActionable = true;
        });
    }

    if (player.fellowshipArea) {
        player.fellowshipArea.forEach((card) => {
            if (evaluateCard(card)) hasActionable = true;
        });
    }

    return hasActionable;
};

// Petit helper optionnel si l'Ombre a des cartes sur le champ de bataille
function cardMatchesPlayer(playerID: string, G: GameState): boolean {
    const fpId = G.fpPlayerId || '0';
    return playerID !== fpId;
}
