import type {
    Ability,
    CardState,
    CostSelector,
    GameState,
    SiteCardState,
} from '../../types';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { isRingBearerCard } from '../../../utils/cardUtils';
import { resolveAbilityTarget, resolveCostTarget, resolveWinnerTargets } from './resolveCostTarget';
import { findEventAbilityForPhase } from './playEventAbility';

import { findSkirmishToCancel } from './cancelSkirmish';
import { countFromSpotCost, abilityReplaceSiteEffect, abilityExchangeSiteEffect } from './applyAbilityEffect';
import {
    getReplaceSiteCandidates,
    getReplaceablePathSitesInCurrentRegion,
    getOwnedPathSites,
    canExchangeOwnedPathSite,
    canTakeControlOfASite,
    canLiberateASite,
    getSitesControlledBy,
    isCardStackedOnControlledSite,
    findStackedCardSite,
    getCurrentSiteIndex,
    getStackedMinionsOnControlledSites,
} from '../../logic/sites';
import { getEffectiveTwilightCost } from '../../../utils/roamingDetection';
import {
    canReplaceCurrentSite,
    canReplaceSiteInCurrentRegionForPlayer,
    isSiteReplaceForbidden,
} from '../../logic/siteReplaceRestrictions';
import { abilityOwnerPlayerId } from './payAbilityCost';
import {
    attachesToSite,
    canAttachToCharacter,
} from '../canPlayCard';

export function cardTargetIds(card: CardState): string[] {
    const ids = [card.instanceId, card.id].filter(Boolean);
    return [...new Set(ids)];
}

function uniqueCards(cards: CardState[]): CardState[] {
    const seen = new Set<string>();
    return cards.filter((card) => {
        const key = card.instanceId || card.id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function isHealableCard(card: CardState): boolean {
    return Boolean(card) && !card.isDead && (card.wounds || 0) > 0;
}

function candidatesForEffect(
    G: GameState,
    source: CardState,
    ability: Ability,
    effect: Ability['effects'][number]
): CardState[] {
    if (!('target' in effect)) return [];
    if (effect.target === 'WINNER') {
        return uniqueCards(resolveWinnerTargets(G, source, ability));
    }
    let matches = uniqueCards(resolveCostTarget(G, source, effect.target));
    if (effect.type === 'STACK_ON_CONTROLLED_SITE') {
        return matches.filter(
            (card) =>
                card.type === 'MINION' &&
                card.kind === 'SHADOW' &&
                !card.isDead &&
                Boolean(
                    (G.battlefield || []).some(
                        (c) =>
                            c &&
                            (c.instanceId === card.instanceId ||
                                c.id === card.id)
                    )
                )
        );
    }
    if (effect.type === 'PLAY_FROM_STACK' && Array.isArray(effect.target)) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return [];
        const reduce = effect.twilightReduce || 0;
        const siteIndex = getCurrentSiteIndex(G);
        return getStackedMinionsOnControlledSites(
            G,
            ownerId,
            effect.target
        ).filter((card) => {
            const cost = Math.max(
                0,
                getEffectiveTwilightCost(card, siteIndex) - reduce
            );
            return (G.twilightPool || 0) >= cost;
        });
    }
    if (
        effect.type === 'ADD_TEMP_STAT' &&
        effect.excludeSource
    ) {
        const sourceId = source.instanceId || source.id;
        matches = matches.filter(
            (card) => (card.instanceId || card.id) !== sourceId
        );
    }
    if (effect.type === 'WOUND' && effect.excludeRingBearer) {
        matches = matches.filter((card) => !isRingBearerCard(card));
    }
    if (effect.type === 'EXERT') {
        const need = effect.count || 1;
        return matches.filter(
            (card) => !card.isDead && getEffectiveVitality(card) > need
        );
    }
    if (effect.type === 'HEAL') {
        return matches.filter(isHealableCard);
    }
    return matches.filter((card) => !card.isDead);
}

/**
 * Cibles d’un coût à désigner (exert / défausse DNF, pas SELF / BEARER).
 * Unique nommé : le joueur désigne toujours (même une seule cible), pour pouvoir annuler.
 * 0 → impossible ; ≥1 → halo + flèche (main) ou clic (carte en jeu).
 */
export function getCostDesignationCandidates(
    G: GameState,
    source: CardState,
    ability: Ability
): CardState[] {
    const option = (ability.cost || []).find((opt) => {
        const req = opt.exert?.[0];
        if (!req || req.target === 'SELF' || req.target === 'BEARER') {
            return false;
        }
        const count = req.count || 1;
        return resolveCostTarget(G, source, req.target).some(
            (card) => getEffectiveVitality(card) > count
        );
    });

    const req = option?.exert?.[0];
    if (req && req.target !== 'SELF' && req.target !== 'BEARER') {
        const count = req.count || 1;
        return uniqueCards(
            resolveCostTarget(G, source, req.target).filter(
                (card) => getEffectiveVitality(card) > count
            )
        );
    }

    const discardReq = (ability.cost || [])
        .flatMap((opt) => opt.discardFromPlay || [])
        .find((item) => Array.isArray(item.target));
    if (discardReq && Array.isArray(discardReq.target)) {
        return uniqueCards(
            resolveCostTarget(G, source, discardReq.target).filter(
                (card) => !card.isDead
            )
        );
    }

    return [];
}

export function getEffectDesignationCandidates(
    G: GameState,
    source: CardState,
    ability: Ability
): CardState[] {
    const winnerEffect = (ability.effects || []).find(
        (item) => 'target' in item && item.target === 'WINNER'
    );
    if (winnerEffect) {
        const matches = candidatesForEffect(G, source, ability, winnerEffect);
        if (matches.length <= 1) return [];
        return matches;
    }

    const effect = (ability.effects || []).find(
        (item) =>
            'target' in item &&
            (Array.isArray(item.target) || item.target === 'SKIRMISHING')
    );
    if (!effect) return [];
    return candidatesForEffect(G, source, ability, effect);
}

export function getDesignationCandidates(
    G: GameState,
    source: CardState,
    ability: Ability
): CardState[] {
    const cost = getCostDesignationCandidates(G, source, ability);
    if (cost.length > 0) return cost;
    return getEffectDesignationCandidates(G, source, ability);
}

export function abilityNeedsCostDesignation(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    return getCostDesignationCandidates(G, source, ability).length >= 1;
}

export function abilityNeedsEffectDesignation(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    return getEffectDesignationCandidates(G, source, ability).length >= 1;
}

/** Nombre de cibles d’effet à désigner (1, ou min(X, blessés) si multiFromSpot). */
export function getEffectDesignationCount(
    G: GameState,
    source: CardState,
    ability: Ability
): number {
    const heal = (ability.effects || []).find(
        (item) => item.type === 'HEAL' && item.multiFromSpot
    );
    if (heal && heal.type === 'HEAL') {
        const spot = countFromSpotCost(G, source, ability);
        const available = candidatesForEffect(G, source, ability, heal).length;
        return Math.min(Math.max(0, spot), available);
    }
    return 1;
}

export function abilityHasLegalEffectTarget(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    for (const effect of ability.effects || []) {
        if (effect.type === 'MAKE_RING_BEARER') {
            if (isRingBearerCard(source)) return false;
            continue;
        }
        if (effect.type === 'DISCARD_ALL') {
            continue;
        }
        if (effect.type === 'DISCARD_FROM_HAND') {
            continue;
        }
        if (effect.type === 'REPLACE_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (effect.scope === 'REGION') {
                if (
                    !canReplaceSiteInCurrentRegionForPlayer(
                        G,
                        ownerId,
                        effect.siteKeyword
                    )
                ) {
                    return false;
                }
                continue;
            }
            if (
                !canReplaceCurrentSite(G, ownerId, effect.siteKeyword)
            ) {
                return false;
            }
            continue;
        }
        if (effect.type === 'EXCHANGE_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (!canExchangeOwnedPathSite(G, ownerId)) return false;
            continue;
        }
        if (effect.type === 'TAKE_CONTROL_SITE') {
            if (!canTakeControlOfASite(G)) return false;
            continue;
        }
        if (effect.type === 'FORCE_CHOOSE_MOVE_AGAIN') {
            continue;
        }
        if (effect.type === 'LIBERATE_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (!canLiberateASite(G, ownerId)) return false;
            continue;
        }
        if (effect.type === 'STACK_ON_CONTROLLED_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (getSitesControlledBy(G, ownerId).length === 0) return false;
            if (Array.isArray(effect.target)) {
                if (candidatesForEffect(G, source, ability, effect).length < 1) {
                    return false;
                }
                continue;
            }
            if (findStackedCardSite(G, source.instanceId || source.id)) {
                return false;
            }
            continue;
        }
        if (effect.type === 'PLAY_FROM_STACK') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (Array.isArray(effect.target)) {
                if (candidatesForEffect(G, source, ability, effect).length < 1) {
                    return false;
                }
                continue;
            }
            if (!isCardStackedOnControlledSite(G, source, ownerId)) {
                return false;
            }
            const reduce = effect.twilightReduce || 0;
            const cost = Math.max(
                0,
                getEffectiveTwilightCost(source, getCurrentSiteIndex(G)) -
                    reduce
            );
            if ((G.twilightPool || 0) < cost) return false;
            continue;
        }
        if (
            effect.type === 'REMOVE_TWILIGHT' ||
            effect.type === 'REMOVE_BURDENS' ||
            effect.type === 'REMOVE_THREATS'
        ) {
            continue;
        }
        if (effect.type === 'CANCEL_SKIRMISH') {
            if (!findSkirmishToCancel(G, source, effect.involving)) {
                return false;
            }
            continue;
        }
        if (effect.type === 'HEAL' && effect.multiFromSpot) {
            if (candidatesForEffect(G, source, ability, effect).length < 1) {
                return false;
            }
            continue;
        }
        if (!('target' in effect)) continue;
        if (effect.target === 'SELF' || effect.target === 'BEARER') {
            if (effect.type === 'HEAL') {
                const card = resolveAbilityTarget(G, source, effect.target);
                if (!card || !isHealableCard(card)) return false;
            }
            if (effect.type === 'ADD_TEMP_STAT' && effect.limit != null) {
                const used = (G.tempModifiers || [])
                    .filter((mod) => mod.id.startsWith(`${ability.id}:`))
                    .reduce((sum, mod) => sum + mod.value, 0);
                if (used + effect.value > effect.limit) return false;
            }
            continue;
        }
        if (effect.type === 'ADD_TEMP_STAT' && effect.limit != null) {
            const used = (G.tempModifiers || [])
                .filter((mod) => mod.id.startsWith(`${ability.id}:`))
                .reduce((sum, mod) => sum + mod.value, 0);
            if (used + effect.value > effect.limit) return false;
        }
        if (candidatesForEffect(G, source, ability, effect).length === 0) {
            return false;
        }
    }
    return true;
}

export function abilityNeedsDesignation(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    return (
        abilityNeedsCostDesignation(G, source, ability) ||
        abilityNeedsEffectDesignation(G, source, ability)
    );
}

export function formatDesignationPrompt(
    ability: Ability,
    which: 'cost' | 'effect' | 'auto' = 'auto'
): string {
    const costTarget = ability.cost[0]?.exert?.[0]?.target;
    const discardTarget = ability.cost[0]?.discardFromPlay?.[0]?.target;
    const effectTarget =
        ability.effects.find(
            (item) =>
                'target' in item &&
                (Array.isArray(item.target) ||
                    item.target === 'SKIRMISHING' ||
                    item.target === 'WINNER')
        )?.target ?? ability.effects[0]?.target;

    const useEffect =
        which === 'effect' ||
        (which === 'auto' &&
            !Array.isArray(costTarget) &&
            !Array.isArray(discardTarget));

    if (useEffect && effectTarget === 'SKIRMISHING') {
        return 'Choisissez un personnage au combat.';
    }
    const target = useEffect
        ? Array.isArray(effectTarget)
            ? effectTarget
            : null
        : Array.isArray(costTarget)
          ? costTarget
          : Array.isArray(discardTarget)
            ? discardTarget
            : Array.isArray(effectTarget)
              ? effectTarget
              : null;
    if (!target) return 'Choisissez une cible.';
    const tokens = target.flat();
    if (tokens.includes('PIPEWEED')) {
        return 'Choisissez une herbe à pipe.';
    }
    const signetToken = tokens.find((token) =>
        token.toUpperCase().startsWith('SIGNET_')
    );
    if (signetToken) {
        const signet = signetToken.replace(/^SIGNET_/i, '');
        const label =
            signet.charAt(0) + signet.slice(1).toLowerCase();
        return `Choisissez un compagnon au sceau ${label}.`;
    }
    const healMulti = (ability.effects || []).some(
        (item) => item.type === 'HEAL' && item.multiFromSpot
    );
    if (healMulti && useEffect) {
        return 'Choisissez les compagnons à soigner.';
    }
    const label = tokens
        .map((token) => {
            if (token === 'MINION') return 'séide';
            if (token === 'PIPE') return 'pipe';
            return token.charAt(0) + token.slice(1).toLowerCase();
        })
        .join(' ');
    return `Choisissez un ${label}.`;
}

export function isDesignationTargetId(
    designationTargetIds: string[] | undefined,
    targetId?: string | null
): boolean {
    if (!targetId || !designationTargetIds?.length) return false;
    return designationTargetIds.includes(targetId);
}

/** Sites du path ciblables pour REPLACE REGION ou EXCHANGE (1ʳᵉ cible d’un event). */
export function getPathThenDeckSiteTargetIds(
    G: GameState,
    source: CardState,
    ability: Ability
): string[] {
    const ownerId = abilityOwnerPlayerId(G, source);
    if (!ownerId) return [];

    const exchange = abilityExchangeSiteEffect(ability);
    if (exchange) {
        return getOwnedPathSites(G, ownerId)
            .filter(
                ({ site }) =>
                    getReplaceSiteCandidates(G, ownerId, undefined, site.id)
                        .length > 0
            )
            .flatMap(({ site }) =>
                [site.instanceId, site.id].filter(Boolean) as string[]
            );
    }

    const effect = abilityReplaceSiteEffect(ability);
    if (!effect || effect.scope !== 'REGION') return [];

    return getReplaceablePathSitesInCurrentRegion(G)
        .filter(
            ({ site, pathIndex }) =>
                !isSiteReplaceForbidden(G, ownerId, pathIndex) &&
                getReplaceSiteCandidates(
                    G,
                    ownerId,
                    effect.siteKeyword,
                    site.id
                ).length > 0
        )
        .flatMap(({ site }) =>
            [site.instanceId, site.id].filter(Boolean) as string[]
        );
}

/** @deprecated alias — préférer getPathThenDeckSiteTargetIds */
export function getRegionReplacePathSiteTargetIds(
    G: GameState,
    source: CardState,
    ability: Ability
): string[] {
    return getPathThenDeckSiteTargetIds(G, source, ability);
}

/**
 * Cibles pour drag d’event depuis la main (flèche + halo).
 * Inclut désignation classique et sites path pour replace REGION / exchange.
 */
export function getHandEventDesignationTargetIds(
    G: GameState,
    card: CardState,
    phase?: string
): string[] {
    const phaseToMatch = G.responseWindow?.isOpen ? 'RESPONSE' : phase || '';
    const ability = findEventAbilityForPhase(card, phaseToMatch);
    if (!ability) return [];

    if (abilityNeedsDesignation(G, card, ability)) {
        return getDesignationCandidates(G, card, ability).flatMap(cardTargetIds);
    }

    const pathIds = getPathThenDeckSiteTargetIds(G, card, ability);
    if (pathIds.length > 0) return [...new Set(pathIds)];

    return [];
}

/** Coût toPlay.exert nommé (ex. affaiblir un séide Isengard pour Neiges). */
export function getToPlayExertRequirement(
    card: CardState
): { count: number; target: CostSelector } | null {
    const toPlay = card.toPlay;
    if (!Array.isArray(toPlay)) return null;
    for (const option of toPlay) {
        const req = option.exert?.[0];
        if (!req || req.target === 'SELF' || req.target === 'BEARER') continue;
        if (!Array.isArray(req.target)) continue;
        return { count: req.count || 1, target: req.target };
    }
    return null;
}

export function getToPlayExertTargetIds(
    G: GameState,
    card: CardState
): string[] {
    const req = getToPlayExertRequirement(card);
    if (!req || !Array.isArray(req.target)) return [];
    const count = req.count;
    return uniqueCards(
        resolveCostTarget(G, card, req.target).filter(
            (c) => getEffectiveVitality(c) > count
        )
    ).flatMap(cardTargetIds);
}

/** Sites du path où cette condition peut être posée. */
export function getSiteAttachmentHostIds(
    G: GameState,
    card: CardState,
    playerId: string
): string[] {
    if (!attachesToSite(card)) return [];
    const ids: string[] = [];
    for (const site of G.path || []) {
        if (!site) continue;
        if (!canAttachToCharacter(card, site, playerId)) continue;
        const key = (site as SiteCardState & { instanceId?: string })
            .instanceId;
        if (key) ids.push(key);
        if (site.id) ids.push(site.id);
    }
    return [...new Set(ids)];
}
