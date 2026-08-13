/**
 * Transforme une string de keyword brute (ex: "Damage +1.", "ARCHER", "Toil 3")
 * en un chemin d'asset valide et nettoyé.
 */
const KEYWORD_ICON_ALIAS: Record<string, string> = {
    // Si tu veux rediriger tous les Damage +X vers le même picto
    'DAMAGE_PLUS1': 'DAMAGE',
    'DAMAGE_PLUS2': 'DAMAGE',
    'DAMAGE_PLUS3': 'DAMAGE',
    // Si Toil utilise le même picto quel que soit le chiffre
    'TOIL_1': 'TOIL',
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