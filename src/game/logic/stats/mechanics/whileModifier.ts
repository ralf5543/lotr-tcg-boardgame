import type {
    Ability,
    AbilityEffect,
    CardState,
    GameState,
    SkirmishState,
} from '../../../types';
import {
    resolveCostTarget,
    findBearer,
    forEachInPlayCard,
} from '../../../engine/abilities/resolveCostTarget';
import { cardMatchesTarget } from '../../../engine/validations/matchers';
import { findTargetCard, isRingBearerCard } from '../../../../utils/cardUtils';
import {
    isAtSiteWithKeyword,
    isCurrentSiteSanctuary,
    countSitesWithKeyword,
    countSitesControlledBy,
    isCardStackedOnControlledSite,
    getCurrentSiteIndex,
} from '../../sites';

function matchCard(card: CardState, targetId: string): boolean {
    return card.instanceId === targetId || card.id === targetId;
}

function countPerSpot(
    G: GameState,
    source: CardState,
    perSpot: NonNullable<
        Extract<AbilityEffect, { type: 'MODIFY_STAT' }>['perSpot']
    >
): number {
    let cards: CardState[];
    if (perSpot.stackedOnSites) {
        cards = [];
        for (const site of G.path || []) {
            if (!site) continue;
            for (const stacked of site.stacked || []) {
                if (
                    stacked &&
                    !stacked.isDead &&
                    cardMatchesTarget(stacked, perSpot.target)
                ) {
                    cards.push(stacked);
                }
            }
        }
    } else if (perSpot.inFellowship) {
        const fpId = G.fpPlayerId || '0';
        cards = (G.players[fpId]?.fellowshipArea || []).filter(
            (card) =>
                card &&
                !card.isDead &&
                cardMatchesTarget(card, perSpot.target)
        );
    } else {
        cards = resolveCostTarget(G, source, perSpot.target).filter(
            (card) => !card.isDead
        );
    }
    let n = cards.length;
    if (perSpot.limit !== undefined) n = Math.min(n, perSpot.limit);
    return Math.max(0, n);
}

function countDistinctRaces(
    G: GameState,
    races: string[],
    inFellowship?: boolean
): number {
    const wanted = new Set(races.map((r) => r.toUpperCase()));
    const seen = new Set<string>();
    const visit = (card: CardState) => {
        if (!card || card.isDead) return;
        const race = (card.race || '').toUpperCase();
        if (race && wanted.has(race)) seen.add(race);
    };
    if (inFellowship) {
        const fpId = G.fpPlayerId || '0';
        (G.players[fpId]?.fellowshipArea || []).forEach(visit);
    } else {
        forEachInPlayCard(G, visit);
    }
    return seen.size;
}

function modifyStatMagnitude(
    G: GameState,
    source: CardState,
    effect: Extract<AbilityEffect, { type: 'MODIFY_STAT' }>
): number {
    const base = effect.value || 0;
    if (effect.perDistinctRace) {
        return (
            base *
            countDistinctRaces(
                G,
                effect.perDistinctRace.races,
                effect.perDistinctRace.inFellowship
            )
        );
    }
    if (effect.perSpot) {
        return base * countPerSpot(G, source, effect.perSpot);
    }
    return base;
}

function skirmishInvolves(skirmish: SkirmishState, cardId: string): boolean {
    if (skirmish.companionId === cardId) return true;
    if (skirmish.minionIds?.some((id) => id === cardId)) return true;
    if (skirmish.minionId === cardId) return true;
    return false;
}

function findSkirmishForCard(
    G: GameState,
    cardId: string
): SkirmishState | undefined {
    const list = G.skirmishes || [];
    if (G.activeSkirmishId) {
        const active = list.find((s) => s.id === G.activeSkirmishId);
        if (active && skirmishInvolves(active, cardId)) return active;
    }
    return list.find((s) => skirmishInvolves(s, cardId));
}

/** Opposants dans l’escarmouche de `source` (compagnon ↔ séides). */
function getSkirmishOpponents(
    G: GameState,
    source: CardState
): CardState[] {
    const sourceId = source.instanceId || source.id;
    const skirmish = findSkirmishForCard(G, sourceId);
    if (!skirmish) return [];

    if (source.kind === 'FREE_PEOPLE' || skirmish.companionId === sourceId) {
        const minionIds =
            skirmish.minionIds ||
            (skirmish.minionId ? [skirmish.minionId] : []);
        return minionIds
            .map((id) => findTargetCard(G, id) as CardState | null)
            .filter((c): c is CardState => Boolean(c));
    }

    const companion = findTargetCard(G, skirmish.companionId) as CardState | null;
    return companion ? [companion] : [];
}

export function whileConditionHolds(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    const trigger = ability.trigger;
    if (!trigger || trigger.type !== 'WHILE') return false;

    if (trigger.spotTwilight && trigger.spotTwilight > 0) {
        if ((G.twilightPool || 0) < trigger.spotTwilight) return false;
    }

    for (const req of trigger.spot || []) {
        const count = req.count || 1;
        const cards = resolveCostTarget(G, source, req.target);
        if (cards.length < count) return false;
    }

    if (trigger.skirmishing) {
        const opponents = getSkirmishOpponents(G, source);
        if (
            !opponents.some((opp) =>
                cardMatchesTarget(opp, trigger.skirmishing!.target)
            )
        ) {
            return false;
        }
    }

    if (trigger.bearing) {
        const attachments = source.attachments || [];
        if (
            !attachments.some((att) =>
                att ? cardMatchesTarget(att, trigger.bearing!.target) : false
            )
        ) {
            return false;
        }
    }

    if (trigger.atSiteKeyword) {
        // Sanctuaire Standard = emplacements 3/6 (ou mot-clé pré-Shadows)
        if (trigger.atSiteKeyword === 'SANCTUARY') {
            if (!isCurrentSiteSanctuary(G)) return false;
        } else if (!isAtSiteWithKeyword(G, trigger.atSiteKeyword)) {
            return false;
        }
    }

    if (trigger.spotSiteKeyword) {
        const needed = trigger.spotSiteKeyword.count || 1;
        if (
            countSitesWithKeyword(G, trigger.spotSiteKeyword.keyword) < needed
        ) {
            return false;
        }
    }

    if (trigger.noOpponentControlsSite) {
        const fpId = G.fpPlayerId || '0';
        const shadowId = fpId === '0' ? '1' : '0';
        const ownerId =
            source.kind === 'SHADOW'
                ? shadowId
                : source.kind === 'FREE_PEOPLE'
                  ? fpId
                  : null;
        if (!ownerId) return false;
        const opponentId = ownerId === fpId ? shadowId : fpId;
        if (countSitesControlledBy(G, opponentId) > 0) return false;
    }

    if (trigger.stackedOnControlledSite) {
        const fpId = G.fpPlayerId || '0';
        const ownerId =
            source.kind === 'SHADOW'
                ? fpId === '0'
                    ? '1'
                    : '0'
                : source.kind === 'FREE_PEOPLE'
                  ? fpId
                  : null;
        if (!ownerId) return false;
        if (!isCardStackedOnControlledSite(G, source, ownerId)) return false;
    }

    if (trigger.atAttachedSite) {
        const hostIndex = findAttachedSiteIndex(G, source);
        if (hostIndex < 0) return false;
        if (getCurrentSiteIndex(G) !== hostIndex) return false;
    }

    if (
        trigger.spotBurdensOrRingBearerWounds &&
        trigger.spotBurdensOrRingBearerWounds > 0
    ) {
        const need = trigger.spotBurdensOrRingBearerWounds;
        const fpId = G.fpPlayerId || '0';
        const burdens = G.players[fpId]?.burdens || 0;
        if (burdens < need) {
            let rbWounds = 0;
            forEachInPlayCard(G, (card) => {
                if (isRingBearerCard(card)) {
                    rbWounds = Math.max(rbWounds, card.wounds || 0);
                }
            });
            if (rbWounds < need) return false;
        }
    }

    // Prédicats OK, ou WHILE vide (vrai tant que la carte est en jeu).
    return true;
}

/** Index du site qui porte cette attache, ou -1. */
function findAttachedSiteIndex(G: GameState, attachment: CardState): number {
    const id = attachment.instanceId || attachment.id;
    if (!id) return -1;
    for (let i = 0; i < (G.path || []).length; i++) {
        const site = G.path[i];
        if (!site?.attachments?.length) continue;
        if (
            site.attachments.some(
                (att) => att && (att.instanceId === id || att.id === id)
            )
        ) {
            return i;
        }
    }
    return -1;
}

/** Cartes empilées sur un site contrôlé (passifs type Pillager). */
function forEachStackedOnControlledSite(
    G: GameState,
    visit: (card: CardState) => void
): void {
    for (const site of G.path || []) {
        if (!site || site.controlledBy == null) continue;
        for (const stacked of site.stacked || []) {
            if (!stacked) continue;
            if (
                !isCardStackedOnControlledSite(
                    G,
                    stacked,
                    String(site.controlledBy)
                )
            ) {
                continue;
            }
            visit(stacked);
        }
    }
}

/** Conditions / attaches sur les sites du chemin. */
function forEachSiteAttachment(
    G: GameState,
    visit: (card: CardState) => void
): void {
    for (const site of G.path || []) {
        if (!site?.attachments?.length) continue;
        for (const att of site.attachments) {
            if (att) visit(att);
        }
    }
}

function forEachWhileOnCard(
    G: GameState,
    card: CardState,
    visit: (source: CardState, ability: Ability) => void
): void {
    const consider = (source: CardState) => {
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            visit(source, ability);
        }
    };

    consider(card);
    for (const att of card.attachments || []) {
        if (att) consider(att);
    }
}

/** SELF / BEARER uniquement — les cibles classe passent par le scan global. */
function localBeneficiaryMatches(
    G: GameState,
    source: CardState,
    target: 'SELF' | 'BEARER',
    cardId: string
): boolean {
    let beneficiary: CardState | null = null;
    if (target === 'SELF') {
        beneficiary = source;
    } else {
        beneficiary = findBearer(G, source);
    }
    return Boolean(beneficiary && matchCard(beneficiary, cardId));
}

/**
 * Bonus de force issus des passifs While sur la carte (ou ses attachements),
 * plus les « each [classe] » portés par n’importe quelle carte en jeu.
 */
export function getWhileStrengthBonus(
    G: GameState,
    card: CardState
): number {
    const cardId = card.instanceId || card.id;
    let bonus = 0;

    forEachWhileOnCard(G, card, (source, ability) => {
        for (const effect of ability.effects || []) {
            if (effect.type !== 'MODIFY_STAT') continue;
            if (effect.stat !== 'STRENGTH') continue;
            if (effect.target !== 'SELF' && effect.target !== 'BEARER') continue;
            if (!localBeneficiaryMatches(G, source, effect.target, cardId)) {
                continue;
            }
            bonus += modifyStatMagnitude(G, source, effect);
        }
    });

    forEachInPlayCard(G, (source) => {
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'MODIFY_STAT') continue;
                if (effect.stat !== 'STRENGTH') continue;
                if (!Array.isArray(effect.target)) continue;
                if (!cardMatchesTarget(card, effect.target)) continue;
                bonus += modifyStatMagnitude(G, source, effect);
            }
        }
    });

    forEachSiteAttachment(G, (source) => {
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'MODIFY_STAT') continue;
                if (effect.stat !== 'STRENGTH') continue;
                if (!Array.isArray(effect.target)) continue;
                if (!cardMatchesTarget(card, effect.target)) continue;
                bonus += modifyStatMagnitude(G, source, effect);
            }
        }
    });

    return bonus;
}

/**
 * Mots-clés bruts des passifs While (Damage / Fierce) sur la carte (ou attachements),
 * plus les « each [classe] » portés par n’importe quelle carte en jeu.
 */
export function getWhileKeywordRaws(
    G: GameState,
    card: CardState
): string[] {
    const cardId = card.instanceId || card.id;
    const raw: string[] = [];

    forEachWhileOnCard(G, card, (source, ability) => {
        for (const effect of ability.effects || []) {
            if (effect.type !== 'MODIFY_KEYWORD') continue;
            if (effect.target !== 'SELF' && effect.target !== 'BEARER') continue;
            if (!localBeneficiaryMatches(G, source, effect.target, cardId)) {
                continue;
            }
            raw.push(effect.keyword);
        }
    });

    forEachInPlayCard(G, (source) => {
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'MODIFY_KEYWORD') continue;
                if (!Array.isArray(effect.target)) continue;
                if (!cardMatchesTarget(card, effect.target)) continue;
                raw.push(effect.keyword);
            }
        }
    });

    // Passifs depuis une pile (Pillager empilé → besiegers fierce).
    forEachStackedOnControlledSite(G, (source) => {
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!ability.trigger.stackedOnControlledSite) continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'MODIFY_KEYWORD') continue;
                if (!Array.isArray(effect.target)) continue;
                if (!cardMatchesTarget(card, effect.target)) continue;
                raw.push(effect.keyword);
            }
        }
    });

    return raw;
}

/**
 * Modificateur de coût crépuscule (While SELF TWILIGHT_COST, ex. Olog −2 / empilé).
 * Lu aussi depuis la main (la carte n’est pas encore en jeu).
 */
export function getWhileTwilightCostModifier(
    G: GameState,
    card: CardState
): number {
    let mod = 0;
    for (const ability of card.abilities || []) {
        if (ability.trigger?.type !== 'WHILE') continue;
        if (!whileConditionHolds(G, card, ability)) continue;
        for (const effect of ability.effects || []) {
            if (effect.type !== 'MODIFY_STAT') continue;
            if (effect.stat !== 'TWILIGHT_COST') continue;
            if (effect.target !== 'SELF') continue;
            mod += modifyStatMagnitude(G, card, effect);
        }
    }
    return mod;
}

/**
 * True si un passif While en jeu demande d’ignorer la phase donnée.
 */
export function shouldSkipPhase(
    G: GameState,
    phase: 'ARCHERY'
): boolean {
    let skip = false;
    const visit = (source: CardState) => {
        if (skip) return;
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type === 'SKIP_PHASE' && effect.phase === phase) {
                    skip = true;
                    return;
                }
            }
        }
    };
    forEachInPlayCard(G, visit);
    forEachSiteAttachment(G, visit);
    return skip;
}
