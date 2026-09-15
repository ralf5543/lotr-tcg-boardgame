import type { CardKeyword, GameState, SiteCardState } from '../types';

export function getCurrentSiteIndex(G: GameState): number {
    const fpId = G.fpPlayerId || '0';
    return G.players[fpId]?.currentSiteIndex ?? G.currentSiteIndex ?? 0;
}

/** Site du chemin où se trouve la compagnie (null si case vide). */
export function getCurrentSite(G: GameState): SiteCardState | null {
    const index = getCurrentSiteIndex(G);
    const site = G.path?.[index];
    return site ?? null;
}

export function siteHasKeyword(
    site: SiteCardState | null | undefined,
    keyword: CardKeyword
): boolean {
    if (!site?.keywords?.length) return false;
    return site.keywords.some((kw) => kw === keyword);
}

/** La compagnie est-elle sur un site portant ce mot-clé ? */
export function isAtSiteWithKeyword(
    G: GameState,
    keyword: CardKeyword
): boolean {
    return siteHasKeyword(getCurrentSite(G), keyword);
}

/**
 * Y a-t-il au moins un site posé sur le chemin avec ce mot-clé ?
 * (« spot an underground site », etc.)
 */
export function canSpotSiteWithKeyword(
    G: GameState,
    keyword: CardKeyword
): boolean {
    return (G.path || []).some(
        (site) => site !== null && siteHasKeyword(site, keyword)
    );
}

export function isCurrentSiteSanctuary(G: GameState): boolean {
    return isAtSiteWithKeyword(G, 'SANCTUARY');
}
