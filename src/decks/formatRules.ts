/**
 * Format Standard (règles modernes) — pool large, sites Shadows+.
 * X-list : ids interdits (vide en v1, structure prête).
 */

/** Sets de sites autorisés sur le chemin d’aventure. */
export const STANDARD_SITE_SETS = [11, 12, 13, 14, 15, 16, 17, 18] as const;

/** Plafond de coût crépuscule des compagnons de départ (hors Porteur). */
export const STARTING_FELLOWSHIP_TWILIGHT_CAP = 4;

/** Taille mini de la pioche (FP + Ombre, hors Porteur / Anneau / sites). */
export const MIN_DRAW_DECK_SIZE = 60;

/** Copies max d’un même titre dans la pioche (+ départ). */
export const MAX_COPIES_PER_TITLE = 4;

/** Copies max du titre du Porteur dans la pioche (+ départ). */
export const MAX_RING_BEARER_COPIES_IN_DECK = 3;

/** Max de sites avec le même crépuscule imprimé. */
export const MAX_SITES_SAME_TWILIGHT = 3;

/**
 * Cartes exclues du format (ids). Vide en v1 — à remplir plus tard.
 */
export const X_LIST: readonly string[] = [];

export function isOnXList(cardId: string): boolean {
    const needle = cardId.toLowerCase();
    return X_LIST.some((id) => id.toLowerCase() === needle);
}

export function isStandardSiteSet(set: number): boolean {
    return (STANDARD_SITE_SETS as readonly number[]).includes(set);
}
