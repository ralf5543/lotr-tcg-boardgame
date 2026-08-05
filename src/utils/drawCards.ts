import type { GameState, PlayerState } from "../game/types";

export const drawCardsForPlayer = (
    G: GameState,
    player: PlayerState,
    count: number,
    isFellowshipPhase: boolean = false
): number => {
    let cardsToDraw = count;

    // 🟢 Règle Communauté : 4 cartes max piochées/ajoutées par phase
    if (isFellowshipPhase) {
        const remainingAllowed = Math.max(0, 4 - (G.fellowshipCardsDrawn || 0));
        cardsToDraw = Math.min(cardsToDraw, remainingAllowed);
    }

    let drawn = 0;
    for (let i = 0; i < cardsToDraw; i++) {
        if (!player.deck || player.deck.length === 0) break;

        const card = player.deck.shift();
        if (card) {
            player.hand.push(card);
            drawn++;
        }
    }

    if (isFellowshipPhase) {
        G.fellowshipCardsDrawn = (G.fellowshipCardsDrawn || 0) + drawn;
    }

    return drawn;
};

export const reconcileHand = (G: GameState, player: PlayerState): { drawn: number; discarded: number } => {
    const TARGET_HAND_SIZE = 8;
    const currentHandSize = player.hand.length;

    if (currentHandSize < TARGET_HAND_SIZE) {
        const needed = TARGET_HAND_SIZE - currentHandSize;
        const drawn = drawCardsForPlayer(G, player, needed, false);
        return { drawn, discarded: 0 };
    } 
    
    if (currentHandSize > TARGET_HAND_SIZE) {
        const overflow = currentHandSize - TARGET_HAND_SIZE;
        // On défausse les cartes en trop vers la défausse (discard)
        const discardedCards = player.hand.splice(TARGET_HAND_SIZE, overflow);
        player.discard.push(...discardedCards);
        return { drawn: 0, discarded: overflow };
    }

    return { drawn: 0, discarded: 0 };
};