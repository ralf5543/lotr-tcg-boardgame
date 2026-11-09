import { catalogCardId } from '../../decks/cardMeta';
import type { CardState } from '../types';

/** Jetons / cartes empilées / animation / attachements → pas d’empilement visuel. */
export function supportCardHasStoredState(card: CardState): boolean {
    if ((card.stacked || []).length > 0) return true;
    if ((card.attachments || []).length > 0) return true;
    if ((card.wounds || 0) > 0) return true;
    if (card.animatedMinion) return true;
    const tokens = card.cultureTokens;
    if (tokens) {
        for (const count of Object.values(tokens)) {
            if ((count || 0) > 0) return true;
        }
    }
    return false;
}

/**
 * Empilement visuel : non unique, sans état local stocké sur la carte.
 * (Même si la carte *peut* stocker plus tard — tant qu’elle est vide, fan OK.)
 */
export function canVisuallyStackSupportCard(card: CardState): boolean {
    if (card.isUnique) return false;
    if (supportCardHasStoredState(card)) return false;
    return true;
}

export type SupportVisualGroup = {
    /** Clé React stable pour le groupe. */
    key: string;
    catalogId: string;
    /** Première = carte affichée (dessus) ; les autres = décalage à gauche. */
    cards: CardState[];
};

/**
 * Regroupe les copies identiques empilables (même id catalogue, sans état).
 * Préserve l’ordre d’apparition ; une carte « chargée » reste seule.
 */
export function groupSupportAreaForDisplay(
    cards: CardState[]
): SupportVisualGroup[] {
    const groups: SupportVisualGroup[] = [];
    const openByCatalog = new Map<string, SupportVisualGroup>();

    for (const card of cards) {
        if (!card) continue;
        const cid = catalogCardId(card) || card.id;
        if (!canVisuallyStackSupportCard(card)) {
            groups.push({
                key: card.instanceId || card.id,
                catalogId: cid,
                cards: [card],
            });
            continue;
        }
        const existing = openByCatalog.get(cid);
        if (existing) {
            existing.cards.push(card);
            continue;
        }
        const group: SupportVisualGroup = {
            key: `support-stack-${cid}-${card.instanceId || card.id}`,
            catalogId: cid,
            cards: [card],
        };
        openByCatalog.set(cid, group);
        groups.push(group);
    }

    return groups;
}
