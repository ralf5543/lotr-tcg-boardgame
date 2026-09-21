import type {
    CardKeyword,
    CardState,
    GameState,
    SiteCardState,
} from '../types';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { cardMatchesTarget } from '../engine/validations/matchers';

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

export function getEffectiveSiteKeywords(
    site: SiteCardState | null | undefined
): CardKeyword[] {
    if (!site) return [];
    const found = new Set<CardKeyword>();
    for (const kw of site.keywords || []) {
        if (kw) found.add(kw);
    }
    // « This site is a Plains. » / gains terrain — s’ajoute, ne remplace pas
    // (CR : « gains that keyword » ; White Hand Attacker → multi-terrains).
    for (const att of site.attachments || []) {
        for (const kw of att?.grantsKeywords || []) {
            if (kw) found.add(kw);
        }
    }
    return Array.from(found);
}

export function siteHasKeyword(
    site: SiteCardState | null | undefined,
    keyword: CardKeyword
): boolean {
    return getEffectiveSiteKeywords(site).includes(keyword);
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
    site.attachments = [];
}

/** Défausse les séides empilés sur un site (replace — pas de transfert). */
export function discardSiteStacked(
    G: GameState,
    site: SiteCardState | null | undefined
): void {
    const stacked = site?.stacked;
    if (!stacked?.length) return;

    const fpId = G.fpPlayerId || '0';
    const shadowId = Object.keys(G.players).find((id) => id !== fpId) || '1';

    for (const card of stacked) {
        if (!card) continue;
        const ownerId =
            card.kind === 'FREE_PEOPLE'
                ? fpId
                : card.kind === 'SHADOW'
                  ? shadowId
                  : shadowId;
        const player = G.players[ownerId];
        if (!player) continue;
        if (!player.discard) player.discard = [];
        player.discard.push(card);
    }
    site.stacked = [];
}

/** Sites contrôlés par un joueur, plus bas numéro d’abord. */
export function getSitesControlledBy(
    G: GameState,
    playerId: string
): { site: SiteCardState; pathIndex: number }[] {
    const found: { site: SiteCardState; pathIndex: number }[] = [];
    for (let i = 0; i < (G.path?.length || 0); i++) {
        const site = G.path?.[i];
        if (!site?.controlledBy) continue;
        if (String(site.controlledBy) !== String(playerId)) continue;
        found.push({ site, pathIndex: i });
    }
    found.sort((a, b) => {
        const na = a.site.siteNumber ?? a.pathIndex + 1;
        const nb = b.site.siteNumber ?? b.pathIndex + 1;
        return na - nb;
    });
    return found;
}

export function findStackedCardSite(
    G: GameState,
    cardId: string
): { site: SiteCardState; pathIndex: number; card: CardState } | null {
    for (let i = 0; i < (G.path?.length || 0); i++) {
        const site = G.path?.[i];
        if (!site?.stacked?.length) continue;
        const card = site.stacked.find(
            (c) => c && (c.instanceId === cardId || c.id === cardId)
        );
        if (card) return { site, pathIndex: i, card };
    }
    return null;
}

/** Séides empilés sur tes sites contrôlés, optionnellement filtrés. */
export function getStackedMinionsOnControlledSites(
    G: GameState,
    controllerId: string,
    filter?: string[][]
): CardState[] {
    const found: CardState[] = [];
    for (const { site } of getSitesControlledBy(G, controllerId)) {
        for (const card of site.stacked || []) {
            if (!card || card.type !== 'MINION' || card.kind !== 'SHADOW') {
                continue;
            }
            if (filter && !cardMatchesTarget(card, filter)) continue;
            found.push(card);
        }
    }
    return found;
}

export function isCardStackedOnControlledSite(
    G: GameState,
    card: CardState,
    controllerId: string
): boolean {
    const loc = findStackedCardSite(G, card.instanceId || card.id);
    if (!loc) return false;
    return String(loc.site.controlledBy) === String(controllerId);
}

/**
 * Retire une carte du champ de bataille (sans la défausser).
 * Défausse ses attachements.
 */
export function detachCardFromBattlefield(
    G: GameState,
    card: CardState
): CardState | null {
    const targetId = card.instanceId || card.id;
    if (!targetId || !G.battlefield) return null;
    const index = G.battlefield.findIndex(
        (c) => c && (c.instanceId === targetId || c.id === targetId)
    );
    if (index < 0) return null;
    const [removed] = G.battlefield.splice(index, 1);
    if (!removed) return null;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    for (const att of removed.attachments || []) {
        if (!att) continue;
        const ownerId =
            att.kind === 'FREE_PEOPLE'
                ? fpId
                : att.kind === 'SHADOW'
                  ? shadowId
                  : shadowId;
        const player = G.players[ownerId];
        if (!player) continue;
        if (!player.discard) player.discard = [];
        player.discard.push(att);
    }
    removed.attachments = [];
    return removed;
}

/**
 * Empile un séide du champ de bataille sur un site contrôlé.
 * Sans `chosenSiteId` : plus bas numéro contrôlé (1ʳᵉ verticale).
 */
export function stackMinionOnControlledSite(
    G: GameState,
    card: CardState,
    controllerId: string,
    chosenSiteId?: string
): SiteCardState | null {
    if (card.type !== 'MINION' || card.kind !== 'SHADOW') return null;

    const controlled = getSitesControlledBy(G, controllerId);
    if (controlled.length === 0) return null;

    let target = controlled[0];
    if (chosenSiteId) {
        const match = controlled.find(
            ({ site }) =>
                site.instanceId === chosenSiteId || site.id === chosenSiteId
        );
        if (!match) return null;
        target = match;
    }

    const removed = detachCardFromBattlefield(G, card);
    if (!removed) return null;

    if (!target.site.stacked) target.site.stacked = [];
    target.site.stacked.push(removed);
    return target.site;
}

/**
 * Joue un séide empilé sur un site contrôlé vers le champ de bataille.
 * Retourne le coût crépuscule payé, ou null si échec.
 */
export function playStackedMinion(
    G: GameState,
    card: CardState,
    controllerId: string,
    twilightReduce = 0
): number | null {
    const loc = findStackedCardSite(G, card.instanceId || card.id);
    if (!loc) return null;
    if (String(loc.site.controlledBy) !== String(controllerId)) return null;

    const currentSiteIndex = getCurrentSiteIndex(G);
    const baseCost = getEffectiveTwilightCost(card, currentSiteIndex);
    const cost = Math.max(0, baseCost - (twilightReduce || 0));
    if ((G.twilightPool || 0) < cost) return null;

    const stackIndex = (loc.site.stacked || []).findIndex(
        (c) =>
            c &&
            (c.instanceId === (card.instanceId || card.id) ||
                c.id === (card.instanceId || card.id))
    );
    if (stackIndex < 0) return null;
    const [played] = loc.site.stacked!.splice(stackIndex, 1);
    if (!played) return null;

    G.twilightPool = (G.twilightPool || 0) - cost;
    if (!G.battlefield) G.battlefield = [];
    G.battlefield.push(played);
    return cost;
}

/**
 * Sites déjà passés par la compagnie, non contrôlés — éligibles au contrôle (CR).
 * Ordre : plus bas numéro de site d’abord.
 */
export function getControllablePathSites(
    G: GameState
): { site: SiteCardState; pathIndex: number }[] {
    const currentIndex = getCurrentSiteIndex(G);
    const found: { site: SiteCardState; pathIndex: number }[] = [];
    for (let i = 0; i < currentIndex; i++) {
        const site = G.path?.[i];
        if (!site) continue;
        if (site.controlledBy) continue;
        found.push({ site, pathIndex: i });
    }
    found.sort((a, b) => {
        const na = a.site.siteNumber ?? a.pathIndex + 1;
        const nb = b.site.siteNumber ?? b.pathIndex + 1;
        return na - nb;
    });
    return found;
}

/** Y a-t-il au moins un site contrôlable sur le chemin ? */
export function canTakeControlOfASite(G: GameState): boolean {
    return getControllablePathSites(G).length > 0;
}

/** Nombre de sites contrôlés par un joueur. */
export function countSitesControlledBy(
    G: GameState,
    playerId: string
): number {
    return (G.path || []).filter(
        (site) => site !== null && site.controlledBy === playerId
    ).length;
}

/**
 * Prend le contrôle du site non contrôlé de plus bas numéro déjà passé.
 * Le site reste sur le chemin (drapeau joueur) — pas de déplacement en support.
 */
export function takeControlOfSite(
    G: GameState,
    playerId: string
): SiteCardState | null {
    const [first] = getControllablePathSites(G);
    if (!first) return null;
    first.site.controlledBy = playerId;
    return first.site;
}

/**
 * Sites contrôlés par un adversaire — éligibles à la libération (CR).
 * Ordre : plus haut numéro de site d’abord.
 */
export function getLiberatableSites(
    G: GameState,
    liberatingPlayerId: string
): { site: SiteCardState; pathIndex: number }[] {
    const found: { site: SiteCardState; pathIndex: number }[] = [];
    for (let i = 0; i < (G.path?.length || 0); i++) {
        const site = G.path?.[i];
        if (!site?.controlledBy) continue;
        if (site.controlledBy === liberatingPlayerId) continue;
        found.push({ site, pathIndex: i });
    }
    found.sort((a, b) => {
        const na = a.site.siteNumber ?? a.pathIndex + 1;
        const nb = b.site.siteNumber ?? b.pathIndex + 1;
        return nb - na;
    });
    return found;
}

export function canLiberateASite(
    G: GameState,
    liberatingPlayerId: string
): boolean {
    return getLiberatableSites(G, liberatingPlayerId).length > 0;
}

/**
 * Libère le site adverse contrôlé de plus haut numéro.
 * Reste sur le chemin ; conditions attachées défaussées (stack plus tard).
 */
export function liberateSite(
    G: GameState,
    liberatingPlayerId: string
): SiteCardState | null {
    const [first] = getLiberatableSites(G, liberatingPlayerId);
    if (!first) return null;
    discardSiteAttachments(G, first.site);
    // Stack : les séides restent empilés (inertes sans contrôle) — pas de défausse.
    delete first.site.controlledBy;
    return first.site;
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
    discardSiteStacked(G, oldSite);

    newSite.siteNumber = siteNumber;
    newSite.ownerId = ownerId;
    newSite.attachments = [];
    newSite.stacked = [];
    delete newSite.controlledBy;

    const returned: SiteCardState = {
        ...oldSite,
        siteNumber: undefined,
        attachments: [],
        stacked: [],
        controlledBy: undefined,
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

