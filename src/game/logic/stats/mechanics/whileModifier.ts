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
import { findTargetCard } from '../../../../utils/cardUtils';
import {
    isAtSiteWithKeyword,
    isCurrentSiteSanctuary,
    countSitesWithKeyword,
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
    if (perSpot.inFellowship) {
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

function whileConditionHolds(
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

    // Prédicats OK, ou WHILE vide (vrai tant que la carte est en jeu).
    return true;
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

    return raw;
}

/**
 * True si un passif While en jeu demande d’ignorer la phase donnée.
 */
export function shouldSkipPhase(
    G: GameState,
    phase: 'ARCHERY'
): boolean {
    let skip = false;
    forEachInPlayCard(G, (source) => {
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
    });
    return skip;
}
