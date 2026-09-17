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
    return countSitesWithKeyword(G, keyword) >= 1;
}

/** Nombre de sites posés sur le chemin portant ce mot-clé. */
export function countSitesWithKeyword(
    G: GameState,
    keyword: CardKeyword
): number {
    return (G.path || []).filter(
        (site) => site !== null && siteHasKeyword(site, keyword)
    ).length;
}

export function isCurrentSiteSanctuary(G: GameState): boolean {
    const index = getCurrentSiteIndex(G);
    // Standard / post-Shadows : sites 3 et 6 du chemin sont des sanctuaires
    // (la carte y « gagne » Sanctuary tant qu’elle est à cet emplacement).
    if (index === 2 || index === 5) return true;
    // Sites pré-Shadows : mot-clé imprimé éventuel
    return siteHasKeyword(getCurrentSite(G), 'SANCTUARY');
}

/** Région 1 (sites 1–3), 2 (4–6) ou 3 (7–9). */
export function getSiteRegion(siteNumber: number): 1 | 2 | 3 {
    if (siteNumber <= 3) return 1;
    if (siteNumber <= 6) return 2;
    return 3;
}

/** Crépuscule de région au déplacement vers ce numéro de site (Standard). */
export function getRegionTwilightBonus(siteNumber: number): number {
    const region = getSiteRegion(siteNumber);
    if (region === 2) return 3;
    if (region === 3) return 6;
    return 0;
}

/**
 * Sites du deck d’aventure éligibles pour un remplacement
 * (filtre terrain optionnel ; exclut le même id que le site courant).
 */
export function getReplaceSiteCandidates(
    G: GameState,
    ownerId: string,
    siteKeyword?: CardKeyword
): SiteCardState[] {
    const player = G.players[ownerId];
    if (!player?.sitesDeck?.length) return [];
    const current = getCurrentSite(G);
    return player.sitesDeck.filter((site) => {
        if (!site) return false;
        if (current && site.id === current.id) return false;
        if (siteKeyword && !siteHasKeyword(site, siteKeyword)) return false;
        return true;
    });
}

/**
 * Remplace le site courant par un site du deck d’aventure du propriétaire.
 * Pas de crépuscule de move / MOVES_FROM|TO. Attachments transférés.
 */
export function replaceCurrentSiteFromDeck(
    G: GameState,
    ownerId: string,
    newSiteId: string,
    siteKeyword?: CardKeyword
): boolean {
    const player = G.players[ownerId];
    if (!player?.sitesDeck) return false;

    const pathIndex = getCurrentSiteIndex(G);
    const oldSite = G.path?.[pathIndex] ?? null;
    if (!oldSite) return false;

    const deckIndex = player.sitesDeck.findIndex(
        (s) => s && (s.instanceId === newSiteId || s.id === newSiteId)
    );
    if (deckIndex < 0) return false;
    const newSite = player.sitesDeck[deckIndex];
    if (!newSite) return false;
    if (newSite.id === oldSite.id) return false;
    if (siteKeyword && !siteHasKeyword(newSite, siteKeyword)) return false;

    player.sitesDeck.splice(deckIndex, 1);

    const siteNumber = oldSite.siteNumber ?? pathIndex + 1;
    const attachments = [...(oldSite.attachments || [])];

    newSite.siteNumber = siteNumber;
    newSite.ownerId = ownerId;
    newSite.attachments = attachments;

    const returned: SiteCardState = {
        ...oldSite,
        siteNumber: undefined,
        attachments: [],
    };
    const returnOwnerId = oldSite.ownerId || ownerId;
    const returnPlayer = G.players[returnOwnerId];
    if (returnPlayer?.sitesDeck) {
        returnPlayer.sitesDeck.push(returned);
    } else {
        player.sitesDeck.push(returned);
    }

    G.path[pathIndex] = newSite;
    return true;
}
