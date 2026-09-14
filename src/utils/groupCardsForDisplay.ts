import type { CardState } from '../game/types';

export interface GroupedCardEntry {
    /** Exemplaire le plus récent (LIFO). */
    card: CardState;
    count: number;
}

/**
 * Regroupe par id de carte (template), compte les doublons,
 * ordre = dernière apparition en haut de pile en premier.
 */
export function groupCardsForDisplay(cards: CardState[]): GroupedCardEntry[] {
    if (!cards.length) return [];

    const counts = new Map<string, number>();
    const latest = new Map<string, CardState>();
    const order: string[] = [];

    for (let i = cards.length - 1; i >= 0; i--) {
        const card = cards[i];
        if (!card?.id) continue;

        counts.set(card.id, (counts.get(card.id) || 0) + 1);
        if (!latest.has(card.id)) {
            latest.set(card.id, card);
        }
    }

    for (let i = cards.length - 1; i >= 0; i--) {
        const card = cards[i];
        if (!card?.id) continue;
        if (!order.includes(card.id)) {
            order.push(card.id);
        }
    }

    return order.map((id) => ({
        card: latest.get(id)!,
        count: counts.get(id) || 1,
    }));
}
