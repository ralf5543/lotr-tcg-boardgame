import type { CardKeyword, GameState } from '../types';
import { forEachInPlayCard } from '../engine/abilities/resolveCostTarget';
import { whileConditionHolds } from './stats/mechanics/whileModifier';
import {
    getCurrentSiteIndex,
    getFellowshipCurrentRegion,
    getReplaceSiteCandidates,
    getReplaceablePathSitesInCurrentRegion,
    getSiteRegion,
} from './sites';

/**
 * True si un passif While interdit au joueur actif de remplacer
 * le site à cet emplacement du chemin.
 */
export function isSiteReplaceForbidden(
    G: GameState,
    actingPlayerId: string,
    pathIndex: number
): boolean {
    const fpId = G.fpPlayerId || '0';
    const isFp = actingPlayerId === fpId;
    const currentIndex = getCurrentSiteIndex(G);
    const fellowshipRegion = getFellowshipCurrentRegion(G);
    const siteNumber = pathIndex + 1;
    const siteRegion = getSiteRegion(siteNumber);

    let forbidden = false;
    forEachInPlayCard(G, (source) => {
        if (forbidden) return;
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'CANNOT_REPLACE_SITE') continue;
                if (effect.player === 'FREE_PEOPLE' && !isFp) continue;

                if (effect.scope === 'ANY') {
                    forbidden = true;
                    return;
                }
                if (
                    effect.scope === 'CURRENT' &&
                    pathIndex === currentIndex
                ) {
                    forbidden = true;
                    return;
                }
                if (
                    effect.scope === 'REGION' &&
                    siteRegion === fellowshipRegion
                ) {
                    forbidden = true;
                    return;
                }
            }
        }
    });
    return forbidden;
}

/** Replace CURRENT légal pour ce joueur (deck + pas de cannot). */
export function canReplaceCurrentSite(
    G: GameState,
    ownerId: string,
    siteKeyword?: CardKeyword
): boolean {
    if (isSiteReplaceForbidden(G, ownerId, getCurrentSiteIndex(G))) {
        return false;
    }
    return getReplaceSiteCandidates(G, ownerId, siteKeyword).length > 0;
}

/** Replace REGION légal : au moins une paire path/deck non bloquée. */
export function canReplaceSiteInCurrentRegionForPlayer(
    G: GameState,
    ownerId: string,
    siteKeyword?: CardKeyword
): boolean {
    return getReplaceablePathSitesInCurrentRegion(G).some(
        ({ site, pathIndex }) =>
            !isSiteReplaceForbidden(G, ownerId, pathIndex) &&
            getReplaceSiteCandidates(G, ownerId, siteKeyword, site.id)
                .length > 0
    );
}
