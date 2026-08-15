import type { LotrMoveContext } from './types';
import { devMoves } from './dev/devMoves';

/**
 * Utilitaire : Récupère l'ID du joueur cible ou actif
 */
export const getTargetPlayerId = (
    playerID: string | null,
    ctx: any
): string => {
    return playerID ?? ctx.currentPlayer ?? '0';
};

/**
 * Logique de déplacement de la Compagnie vers le site suivant
 */
export const advanceCompany = (G: any, ctx: any) => {
    G.movesThisTurn = (G.movesThisTurn || 0) + 1;
    G.currentSiteIndex += 1;
    G.awaitingSiteSelection = true;
    G.statusMessage = `La Compagnie avance vers le site ${G.currentSiteIndex + 1}. Choisissez le prochain site.`;
};

/**
 * Actions communes (injectées dans presque toutes les phases via ...commonMoves)
 */
export const commonMoves = {
    ...devMoves,
    /**
     * Action générique pour passer dans une fenêtre d'action (Action Window)
     */
    passActionWindow: ({ G, ctx, playerID }: LotrMoveContext) => {
        if (!G.actionWindow || !G.actionWindow.isOpen) {
            return 'INVALID_MOVE';
        }

        // Seul le joueur qui a la priorité peut passer
        if (G.actionWindow.activePlayerId !== playerID) {
            return 'INVALID_MOVE';
        }

        G.actionWindow.passesCount = (G.actionWindow.passesCount || 0) + 1;

        // Si les deux joueurs ont passé consécutivement, on ferme la fenêtre d'action
        if (G.actionWindow.passesCount >= 2) {
            G.actionWindow.isOpen = false;
            G.actionWindow = undefined;
            G.statusMessage = 'Les deux joueurs ont passé. Fin de la fenêtre d’action.';
            return;
        }

        // Sinon, on donne la main à l'autre joueur
        const otherPlayerId = playerID === '0' ? '1' : '0';
        G.actionWindow.activePlayerId = otherPlayerId;
        G.statusMessage = `Joueur ${playerID} passe. Au tour du Joueur ${otherPlayerId}.`;
    },

    /**
     * Reordonner la Compagnie (s'il y a un effet ou une capacité le permettant)
     */
    reorderFellowship: (
        { G, playerID }: LotrMoveContext,
        newOrderIndexes: number[]
    ) => {
        const fpId = G.fpPlayerId || '0';
        if (playerID !== fpId) return 'INVALID_MOVE';

        const fpPlayer = G.players[fpId];
        if (!fpPlayer || !fpPlayer.fellowshipArea) return 'INVALID_MOVE';

        if (newOrderIndexes.length !== fpPlayer.fellowshipArea.length) {
            return 'INVALID_MOVE';
        }

        const reordered = newOrderIndexes.map(
            (idx) => fpPlayer.fellowshipArea[idx]
        );

        // S'assurer qu'aucune carte n'a été perdue/dupliquée lors du réordonnancement
        if (reordered.some((card) => !card)) return 'INVALID_MOVE';

        fpPlayer.fellowshipArea = reordered;
        G.statusMessage = 'La Compagnie a été réordonnée.';
    },
};