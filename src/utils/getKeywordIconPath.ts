/**
 * Transforme une string de keyword brute (ex: "Damage +1.", "ARCHER", "Toil 3")
 * en un chemin d'asset valide et nettoyé.
 */
const KEYWORD_ICON_ALIAS: Record<string, string> = {
    'AMBUSH_1': 'AMBUSH',
    'AMBUSH_2': 'AMBUSH',
    'AMBUSH_3': 'AMBUSH',
    'AMBUSH_5': 'AMBUSH',
    'DAMAGE_PLUS1': 'DAMAGE',
    'DAMAGE_PLUS2': 'DAMAGE',
    'DAMAGE_PLUS3': 'DAMAGE',
    'DAMAGE_PLUS4': 'DAMAGE',
    'TOIL_1': 'TOIL',
    'TOIL_2': 'TOIL',
    'TOIL_2': 'TOIL',
};

export const getKeywordIconPath = (keyword: string): string => {
    const rawSlug = keyword
        .trim()
        .toLowerCase()
        .replace(/[.,]/g, '')
        .replace(/\+/g, 'plus')
        .replace(/[\s\W]+/g, '_')
        .toUpperCase();

    // On vérifie s'il existe un alias, sinon on prend le slug tel quel
    const finalName = KEYWORD_ICON_ALIAS[rawSlug] || rawSlug;

    return `/interface/pictos/${finalName}.webp`;
};