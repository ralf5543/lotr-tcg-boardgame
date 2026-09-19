import type {
    CardKeyword,
    CardState,
    GameState,
    SiteCardState,
} from '../types';

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

/** Région où se trouve la compagnie (Standard). */
export function getFellowshipCurrentRegion(G: GameState): 1 | 2 | 3 {
    const index = getCurrentSiteIndex(G);
    return getSiteRegion(index + 1);
}

/** Sites posés sur le chemin dans une région donnée. */
export function getPathSitesInRegion(
    G: GameState,
    region: 1 | 2 | 3
): { site: SiteCardState; pathIndex: number }[] {
    const found: { site: SiteCardState; pathIndex: number }[] = [];
    for (let i = 0; i < 9; i++) {
        const site = G.path[i];
        if (!site) continue;
        const siteNumber = site.siteNumber ?? i + 1;
        if (getSiteRegion(siteNumber) === region) {
            found.push({ site, pathIndex: i });
        }
    }
    return found;
}

/** Sites remplaçables dans la région courante de la compagnie. */
export function getReplaceablePathSitesInCurrentRegion(
    G: GameState
): { site: SiteCardState; pathIndex: number }[] {
    return getPathSitesInRegion(G, getFellowshipCurrentRegion(G));
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
 * (filtre terrain optionnel ; exclut le même id que le site remplacé).
 */
export function getReplaceSiteCandidates(
    G: GameState,
    ownerId: string,
    siteKeyword?: CardKeyword,
    excludeSiteId?: string
): SiteCardState[] {
    const player = G.players[ownerId];
    if (!player?.sitesDeck?.length) return [];
    return player.sitesDeck.filter((site) => {
        if (!site) return false;
        if (excludeSiteId && site.id === excludeSiteId) return false;
        if (siteKeyword && !siteHasKeyword(site, siteKeyword)) return false;
        return true;
    });
}

/** Au moins une paire (site path owned, site deck) pour EXCHANGE_SITE. */
export function canExchangeOwnedPathSite(
    G: GameState,
    ownerId: string
): boolean {
    return getOwnedPathSites(G, ownerId).some(
        ({ site }) =>
            getReplaceSiteCandidates(G, ownerId, undefined, site.id).length > 0
    );
}

/** Au moins une paire (site région, site deck) légale pour un replace REGION. */
export function canReplaceSiteInCurrentRegion(
    G: GameState,
    ownerId: string,
    siteKeyword?: CardKeyword
): boolean {
    return getReplaceablePathSitesInCurrentRegion(G).some(
        ({ site }) =>
            getReplaceSiteCandidates(G, ownerId, siteKeyword, site.id)
                .length > 0
    );
}

/** Sites du path dont `ownerId` est le joueur (pour échange Led Astray). */
export function getOwnedPathSites(
    G: GameState,
    ownerId: string
): { site: SiteCardState; pathIndex: number }[] {
    const found: { site: SiteCardState; pathIndex: number }[] = [];
    for (let i = 0; i < 9; i++) {
        const site = G.path[i];
        if (!site) continue;
        if ((site.ownerId || '') !== ownerId) continue;
        found.push({ site, pathIndex: i });
    }
    return found;
}

/** Défausse les conditions posées sur un site (pas de transfert au replace). */
export function discardSiteAttachments(
    G: GameState,
    site: SiteCardState | null | undefined
): void {
    const attachments = site?.attachments;
    if (!attachments?.length) return;

    const fpId = G.fpPlayerId || '0';
    const shadowId = Object.keys(G.players).find((id) => id !== fpId) || '1';

    for (const att of attachments) {
        if (!att) continue;
        const ownerId =
            att.kind === 'FREE_PEOPLE'
                ? fpId
                : att.kind === 'SHADOW'
                  ? shadowId
                  : fpId;
        const player = G.players[ownerId];
        if (!player) continue;
        if (!player.discard) player.discard = [];
        player.discard.push(att as CardState);
    }
}

/**
 * Remplace un site du chemin par un site du deck d’aventure du propriétaire.
 * Pas de crépuscule de move / MOVES_FROM|TO. Attachments défaussés (pas transférés).
 */
export function replacePathSiteFromDeck(
    G: GameState,
    ownerId: string,
    pathIndex: number,
    newSiteId: string,
    siteKeyword?: CardKeyword
): boolean {
    const player = G.players[ownerId];
    if (!player?.sitesDeck) return false;

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

    discardSiteAttachments(G, oldSite);

    newSite.siteNumber = siteNumber;
    newSite.ownerId = ownerId;
    newSite.attachments = [];

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

/**
 * Remplace le site courant par un site du deck d’aventure du propriétaire.
 * Pas de crépuscule de move / MOVES_FROM|TO. Attachments défaussés (pas transférés).
 */
export function replaceCurrentSiteFromDeck(
    G: GameState,
    ownerId: string,
    newSiteId: string,
    siteKeyword?: CardKeyword
): boolean {
    return replacePathSiteFromDeck(
        G,
        ownerId,
        getCurrentSiteIndex(G),
        newSiteId,
        siteKeyword
    );
}

