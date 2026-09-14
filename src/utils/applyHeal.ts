import type { CardState, GameState } from '../game/types';

/** Retire des blessures et marque la carte pour le son / le voile. */
export const applyHeal = (
    G: GameState,
    card: CardState,
    amount = 1
): number => {
    if (!card || card.isDead || amount <= 0) return 0;

    const current = card.wounds || 0;
    if (current <= 0) return 0;

    const removed = Math.min(current, amount);
    card.wounds = current - removed;

    const cardId = card.instanceId || card.id;
    if (cardId) {
        if (!G.lastHealedCardIds) G.lastHealedCardIds = [];
        if (!G.lastHealedCardIds.includes(cardId)) {
            G.lastHealedCardIds.push(cardId);
        }
    }

    return removed;
};
