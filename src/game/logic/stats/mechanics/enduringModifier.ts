import type { CardState } from '../../../types';
import { getEffectiveKeywords } from '../../../engine/keywords/keywordUtils';

/**
 * Calcule le bonus de force apporté par le mot-clé ENDURING (Pugnace).
 * Pour chaque blessure sur le personnage, il gagne +2 en Force.
 */
export function getEnduringStrengthBonus(card: CardState): number {
    if (!card) return 0;

    // 1. On vérifie si la carte possède le mot-clé ENDURING (via la base, attachements ou tempKeywords)
    const keywords = getEffectiveKeywords(card);
    const hasEnduring = keywords.some((k) => k.key === 'ENDURING');

    if (!hasEnduring) return 0;

    // 2. Nombre de blessures actuelles sur la carte
    const wounds = Number(card.wounds) || 0;
    if (wounds <= 0) return 0;

    // 3. +2 par blessure
    return wounds * 2;
}