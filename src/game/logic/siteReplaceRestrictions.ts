import type { Ability, CardKeyword, CardState, GameState } from '../types';
import { forEachInPlayCard } from '../engine/abilities/resolveCostTarget';
import { whileConditionHolds } from './stats/mechanics/whileModifier';
import {
    getCurrentSiteIndex,
    getFellowshipCurrentRegion,
    getReplaceSiteCandidates,
    getReplaceablePathSitesInCurrentRegion,
    getSiteRegion,
} from './sites';

type CannotReplaceEffect = Extract<
    Ability['effects'][number],
    { type: 'CANNOT_REPLACE_SITE' }
>;

function isCannotReplaceEffect(
    effect: Ability['effects'][number]
): effect is CannotReplaceEffect {
    return effect.type === 'CANNOT_REPLACE_SITE';
}

/**
 * True si un passif interdit au joueur actif de remplacer
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

    const consider = (source: CardState, sourcePathIndex?: number) => {
        if (forbidden) return;
        for (const ability of source.abilities || []) {
            for (const effect of ability.effects || []) {
                if (!isCannotReplaceEffect(effect)) continue;
                if (effect.player === 'FREE_PEOPLE' && !isFp) continue;

                // Mount Doom : actif dès que le site est sur le chemin
                // (Legacy Ruling 3 — pas besoin d’y être).
                if (effect.activeOnPath && effect.scope === 'SOURCE_REGION') {
                    const srcNum =
                        source.siteNumber ??
                        (typeof sourcePathIndex === 'number'
                            ? sourcePathIndex + 1
                            : undefined);
                    if (srcNum == null) continue;
                    if (siteRegion === getSiteRegion(srcNum)) {
                        forbidden = true;
                        return;
                    }
                    continue;
                }

                if (ability.trigger?.type !== 'WHILE') continue;
                if (!whileConditionHolds(G, source, ability)) continue;

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
    };

    forEachInPlayCard(G, consider);
    (G.path || []).forEach((site, idx) => {
        if (site) consider(site as CardState, idx);
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
