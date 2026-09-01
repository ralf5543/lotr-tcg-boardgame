import type { GameState, CardState } from "../game/types";

export const clearActionableFlags = (G: GameState) => {
    // Fonction récursive pour nettoyer la carte ET ses attachements
    const clearCard = (card: CardState) => {
        card.isActionable = false;
        if (card.attachments && card.attachments.length > 0) {
            card.attachments.forEach((att) => {
                att.isActionable = false;
            });
        }
    };

    // Nettoyage des zones de chaque joueur
    Object.values(G.players || {}).forEach((player) => {
        player.supportArea?.forEach(clearCard);
        player.fellowshipArea?.forEach(clearCard);
    });

    // Nettoyage du champ de bataille
    if (G.battlefield) {
        G.battlefield.forEach(clearCard);
    }
};