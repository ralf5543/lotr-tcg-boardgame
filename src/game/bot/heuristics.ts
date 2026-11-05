/**
 * Conseils BOT playtest — heuristiques simples (pas une IA).
 * Vague A : affectation par force, double déplacement…
 */

import type { Ability, CardState, GameState } from '../types';
import {
    canCompanionBeAssigned,
    getAssignableMinionCapacity,
    getSiteMaxMinionsPerSkirmish,
    getUnassignedMinions,
} from '../logic/assignment';
import { getSanctuaryHealCandidates } from '../logic/sanctuary';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { getEffectiveVitality } from '../../utils/cardStats';
import { findTargetCard, isRingBearerCard } from '../../utils/cardUtils';
import {
    abilityMatchesPhase,
    collectVisibleAbilities,
} from '../engine/abilities/collectAbilities';
import {
    abilityNeedsHandDiscard,
    canPayAbilityCost,
} from '../engine/abilities/payAbilityCost';
import {
    abilityHasLegalEffectTarget,
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { canPlayCard } from '../engine/canPlayCard';
import {
    abilityMatchesTrigger,
    responseAbilityStillAvailable,
} from '../engine/responseWindow';
import { fpPlayerId } from './isBotToAct';

/** Stop si séides / compagnons ≥ ce ratio (hors approche site 9). */
export const MOVE_AGAIN_STOP_RATIO = 2 / 3;
/** Approche site 9 : plus souple (ex. 4 séides / 5 compagnons). */
export const MOVE_AGAIN_SITE9_STOP_RATIO = 4 / 5;

/** B6 : au-delà de 5 compagnons seulement si assez de blessures hors Porteur. */
export const COMPANION_SOFT_CAP = 5;
export const WOUNDS_TO_EXCEED_COMPANION_CAP = 5;

function companionIdOf(c: CardState): string {
    return c.instanceId || c.id;
}

function minionIdOf(m: CardState): string {
    return m.instanceId || m.id;
}

function findSkirmish(G: GameState, companion: CardState) {
    const id = companionIdOf(companion);
    return (G.skirmishes || []).find(
        (s) =>
            s.companionId === id ||
            s.companionId === companion.id ||
            s.companionId === companion.instanceId
    );
}

function assignedMinionStrength(G: GameState, companion: CardState): number {
    const skirmish = findSkirmish(G, companion);
    if (!skirmish?.minionIds.length) return 0;
    return (G.battlefield || []).reduce((sum, m) => {
        const mid = minionIdOf(m);
        if (
            skirmish.minionIds.includes(mid) ||
            skirmish.minionIds.includes(m.id) ||
            (m.instanceId && skirmish.minionIds.includes(m.instanceId))
        ) {
            return sum + getCalculatedStrength(G, m);
        }
        return sum;
    }, 0);
}

function skirmishMinionCount(G: GameState, companion: CardState): number {
    return findSkirmish(G, companion)?.minionIds.length ?? 0;
}

function companionsWithFreeSlot(
    G: GameState,
    forFreePeoples: boolean
): CardState[] {
    const fp = fpPlayerId(G);
    const comps = (G.players[fp]?.fellowshipArea || []).filter(
        (c) => canCompanionBeAssigned(c) && !c.isDead
    );
    const siteCap = getSiteMaxMinionsPerSkirmish(G);
    return comps.filter((c) => {
        const assigned = skirmishMinionCount(G, c);
        const max = forFreePeoples
            ? getAssignableMinionCapacity(c, G)
            : siteCap == null
              ? Number.POSITIVE_INFINITY
              : siteCap;
        return assigned < max;
    });
}

export type AssignmentPick = {
    minionId: string;
    companionId: string;
};

/**
 * A1 — Affectation par force (greedy, un coup).
 * PL : gagner si possible (force > ombre) ; Porteur en dernier.
 * Ombre : battre si possible (force ≥ compagnon) ; cibler les plus faibles.
 */
export function pickAssignmentByStrength(
    G: GameState,
    forFreePeoples: boolean
): AssignmentPick | null {
    const unassigned = [...getUnassignedMinions(G)].sort(
        (a, b) => getCalculatedStrength(G, b) - getCalculatedStrength(G, a)
    );
    const companions = companionsWithFreeSlot(G, forFreePeoples);
    if (unassigned.length === 0 || companions.length === 0) return null;

    let best: {
        pick: AssignmentPick;
        score: number;
    } | null = null;

    const fp = fpPlayerId(G);
    const shadow = fp === '0' ? '1' : '0';

    for (const minion of unassigned) {
        const mBase = getCalculatedStrength(G, minion);
        // B7 : boosts combat potentiels (capa / main).
        const mBoost = potentialSkirmishStrengthBoost(
            G,
            minion,
            shadow
        );
        for (const companion of companions) {
            const cBase = getCalculatedStrength(G, companion);
            const cBoost = potentialSkirmishStrengthBoost(
                G,
                companion,
                fp
            );
            const cStr = cBase + cBoost;
            const mStr = mBase + mBoost;
            const already = assignedMinionStrength(G, companion);
            const enemyAfter = already + mStr;
            const isRb = isRingBearerCard(companion);

            let score: number;
            if (forFreePeoples) {
                // Victoire PL = force strictement supérieure (avec boosts prévus).
                const wouldWin = cStr > enemyAfter;
                if (wouldWin) {
                    // Surplus faible = garder les tanks pour plus tard.
                    const surplus = cStr - enemyAfter;
                    score = 10_000 - surplus * 10 - (isRb ? 500 : 0);
                } else {
                    // Perdu : coller au plus fort non-Porteur (limiter la casse).
                    score = cStr - (isRb ? 1_000 : 0);
                }
            } else {
                // Victoire Ombre = égalité ou plus (CR), en anticipant les boosts PL.
                const wouldWin = enemyAfter >= cStr;
                if (wouldWin) {
                    // Préférer les compagnons faibles (victoires faciles).
                    score = 10_000 - cStr * 10 + (isRb ? 50 : 0);
                } else {
                    // Pas de win : encore le plus faible (pression).
                    score = 100 - cStr - (isRb ? 0 : 5);
                }
            }

            // Séides plus forts d’abord (léger biais via mStr déjà trié).
            score += mStr;

            if (!best || score > best.score) {
                best = {
                    score,
                    pick: {
                        minionId: minionIdOf(minion),
                        companionId: companionIdOf(companion),
                    },
                };
            }
        }
        // Un séide à la fois : le plus fort d’abord suffit.
        if (best) break;
    }

    return best?.pick ?? null;
}

function livingCompanionCount(G: GameState): number {
    const fp = fpPlayerId(G);
    return (G.players[fp]?.fellowshipArea || []).filter(
        (c) => !c.isDead && getEffectiveVitality(c) > 0
    ).length;
}

function livingMinionCount(G: GameState): number {
    return (G.battlefield || []).filter(
        (c) =>
            c.kind === 'SHADOW' &&
            c.type === 'MINION' &&
            !c.isDead &&
            getEffectiveVitality(c) > 0
    ).length;
}

/** Prochain emplacement = site 9 (index 8) ? */
export function wouldMoveToSiteNine(G: GameState): boolean {
    const fp = fpPlayerId(G);
    const idx = G.players[fp]?.currentSiteIndex ?? G.currentSiteIndex ?? 0;
    return idx + 1 === 8;
}

/**
 * A2 — Encore un déplacement au regroupement ?
 * Stop si trop de séides face aux compagnons (≥ ⅔).
 * Vers le site 9 : seuil ⅘ (on peut se permettre de perdre des compagnons).
 */
export function shouldBotMoveAgain(G: GameState): boolean {
    const companions = livingCompanionCount(G);
    if (companions <= 0) return false;

    const minions = livingMinionCount(G);
    const ratio = minions / companions;
    const stopAt = wouldMoveToSiteNine(G)
        ? MOVE_AGAIN_SITE9_STOP_RATIO
        : MOVE_AGAIN_STOP_RATIO;
    return ratio < stopAt;
}

/**
 * A3 — Prochain soin de sanctuaire : les plus blessés d’abord, Porteur en dernier.
 */
export function pickSanctuaryHealTargetId(G: GameState): string | null {
    const candidates = [...getSanctuaryHealCandidates(G)];
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
        const aRb = isRingBearerCard(a) ? 1 : 0;
        const bRb = isRingBearerCard(b) ? 1 : 0;
        if (aRb !== bRb) return aRb - bRb;
        return (b.wounds || 0) - (a.wounds || 0);
    });

    const pick = candidates[0]!;
    return pick.instanceId || pick.id;
}

function abilityWearsRing(ability: Ability): boolean {
    return (ability.effects || []).some((e) => e.type === 'WEAR_RING');
}

/**
 * A4 — Mettre l’Anneau uniquement si la blessure en cours tuerait le Porteur.
 * Sinon : ne jamais le proposer (réponse ou capacité).
 */
export function shouldBotWearTheOneRing(G: GameState): boolean {
    if (G.wearingTheOneRing) return false;
    const event = G.pendingEvent;
    if (!event || event.type !== 'ABOUT_TO_WOUND') return false;
    if (!G.responseWindow?.isOpen) return false;

    const target = findTargetCard(G, event.targetId) as CardState | null;
    if (!target || !isRingBearerCard(target)) return false;

    const remaining = event.remaining || 1;
    return getEffectiveVitality(target) <= remaining;
}

export type WearRingPick = {
    sourceInstanceId: string;
    abilityId: string;
};

/** Capacité WEAR_RING jouable sur la fenêtre ABOUT_TO_WOUND actuelle. */
export function pickWearRingResponse(G: GameState): WearRingPick | null {
    if (!shouldBotWearTheOneRing(G)) return null;

    const fp = fpPlayerId(G);
    const bearer = (G.players[fp]?.fellowshipArea || []).find((c) =>
        isRingBearerCard(c)
    );
    if (!bearer) return null;

    for (const att of bearer.attachments || []) {
        if (!att || att.type !== 'RING') continue;
        for (const ability of att.abilities || []) {
            if (!abilityWearsRing(ability)) continue;
            if (!abilityMatchesTrigger(ability, G.pendingEvent, att, G)) {
                continue;
            }
            if (!responseAbilityStillAvailable(G, att, ability)) continue;
            const sourceInstanceId = att.instanceId || att.id;
            if (!sourceInstanceId || !ability.id) continue;
            return { sourceInstanceId, abilityId: ability.id };
        }
    }
    return null;
}

/**
 * B6 — Autoriser un compagnon de plus ?
 * Moins de 5 en jeu : oui. Sinon seulement si ≥ 5 blessures hors Porteur.
 */
export function mayPlayAnotherCompanion(G: GameState): boolean {
    const fp = fpPlayerId(G);
    const comps = (G.players[fp]?.fellowshipArea || []).filter(
        (c) =>
            c.type === 'COMPANION' &&
            !c.isDead &&
            getEffectiveVitality(c) > 0
    );
    if (comps.length < COMPANION_SOFT_CAP) return true;

    const woundsOffRb = comps.reduce((sum, c) => {
        if (isRingBearerCard(c)) return sum;
        return sum + (c.wounds || 0);
    }, 0);
    return woundsOffRb >= WOUNDS_TO_EXCEED_COMPANION_CAP;
}

/**
 * B7 — Meilleur +force combat encore disponible (capa SELF / event main).
 */
export function potentialSkirmishStrengthBoost(
    G: GameState,
    card: CardState,
    ownerPlayerId: string
): number {
    let best = 0;

    for (const { source, ability } of collectVisibleAbilities(G, card)) {
        if (!abilityMatchesPhase(ability, 'skirmish')) continue;
        if (abilityWearsRing(ability)) continue;
        const boost = selfStrengthBoostFromAbility(ability);
        if (boost <= 0) continue;
        if (!canPayAbilityCost(G, source, ability.cost, ownerPlayerId)) {
            continue;
        }
        best = Math.max(best, boost);
    }

    const hand = G.players[ownerPlayerId]?.hand || [];
    const context = {
        G,
        ctx: { phase: 'skirmish' },
        playerID: ownerPlayerId,
    };
    const targetId = companionIdOf(card);
    for (const event of hand) {
        if (!event || event.type !== 'EVENT') continue;
        if (event.kind === 'SHADOW' && ownerPlayerId === fpPlayerId(G)) {
            continue;
        }
        if (
            event.kind === 'FREE_PEOPLE' &&
            ownerPlayerId !== fpPlayerId(G)
        ) {
            continue;
        }
        const skAb = (event.abilities || []).find((ab) =>
            abilityMatchesPhase(ab, 'skirmish')
        );
        if (!skAb) continue;
        let boost = 0;
        for (const effect of skAb.effects || []) {
            if (effect.type !== 'ADD_TEMP_STAT') continue;
            if (effect.stat !== 'STRENGTH') continue;
            boost += effect.value || 0;
        }
        if (boost <= 0) continue;
        if (!canPlayCard(event, context, targetId, card).valid) continue;
        best = Math.max(best, boost);
    }

    return best;
}

/**
 * B8 — Prochain combat à résoudre : d’abord ceux déjà gagnés (marge).
 */
export function pickNextSkirmishId(G: GameState): string | null {
    const fp = fpPlayerId(G);
    const pending = (G.skirmishes || []).filter(
        (s) => !s.resolved && s.minionIds.length > 0
    );
    if (pending.length === 0) return null;

    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const sk of pending) {
        const companion = (G.players[fp]?.fellowshipArea || []).find(
            (c) =>
                c.instanceId === sk.companionId || c.id === sk.companionId
        );
        if (!companion) continue;
        const minions = (G.battlefield || []).filter(
            (m) =>
                sk.minionIds.includes(m.instanceId || '') ||
                sk.minionIds.includes(m.id)
        );
        const cStr =
            getCalculatedStrength(G, companion) +
            potentialSkirmishStrengthBoost(G, companion, fp);
        const mStr = minions.reduce(
            (sum, m) => sum + getCalculatedStrength(G, m),
            0
        );
        const margin = cStr - mStr;
        // Gagnés d’abord (gros score), puis plus grande marge ; perdus en dernier.
        const score = margin > 0 ? 10_000 + margin : margin;
        if (score > bestScore) {
            bestScore = score;
            bestId = sk.id;
        }
    }

    return bestId ?? pending[0]?.id ?? null;
}

type ActiveSkirmishSides = {
    companion: CardState;
    minions: CardState[];
    companionStr: number;
    minionStr: number;
};

function getActiveSkirmishSides(G: GameState): ActiveSkirmishSides | null {
    if (!G.activeSkirmishId) return null;
    const skirmish = (G.skirmishes || []).find(
        (s) => s.id === G.activeSkirmishId
    );
    if (!skirmish || skirmish.resolved) return null;

    const fp = fpPlayerId(G);
    const companion = (G.players[fp]?.fellowshipArea || []).find(
        (c) =>
            c.instanceId === skirmish.companionId ||
            c.id === skirmish.companionId
    );
    if (!companion) return null;

    const minions = (G.battlefield || []).filter(
        (m) =>
            skirmish.minionIds.includes(m.instanceId || '') ||
            skirmish.minionIds.includes(m.id)
    );
    return {
        companion,
        minions,
        companionStr: getCalculatedStrength(G, companion),
        minionStr: minions.reduce(
            (sum, m) => sum + getCalculatedStrength(G, m),
            0
        ),
    };
}

function fpWinsSkirmish(cStr: number, mStr: number): boolean {
    return cStr > mStr;
}

function shadowWinsSkirmish(cStr: number, mStr: number): boolean {
    return mStr >= cStr;
}

/** Bonus de force ADD_TEMP_STAT sur SELF / BEARER (Gimli +2…). */
export function selfStrengthBoostFromAbility(ability: Ability): number {
    let total = 0;
    for (const effect of ability.effects || []) {
        if (effect.type !== 'ADD_TEMP_STAT') continue;
        if (effect.stat !== 'STRENGTH') continue;
        if (effect.target !== 'SELF' && effect.target !== 'BEARER') continue;
        total += effect.value || 0;
    }
    return total;
}

function eventStrengthBoostToSkirmisher(ability: Ability): number {
    let total = 0;
    for (const effect of ability.effects || []) {
        if (effect.type !== 'ADD_TEMP_STAT') continue;
        if (effect.stat !== 'STRENGTH') continue;
        total += effect.value || 0;
    }
    return total;
}

export type SkirmishActionPick = {
    move: 'activateAbility' | 'playCard';
    args: unknown[];
};

function abilityTooComplexForBot(ability: Ability): boolean {
    if (abilityWearsRing(ability)) return true;
    if (abilityNeedsHandDiscard(ability)) return true;
    return (ability.effects || []).some((e) => e.type === 'CHOOSE_ONE');
}

function woundCountOf(ability: Ability): number {
    const wound = (ability.effects || []).find((e) => e.type === 'WOUND');
    if (!wound || wound.type !== 'WOUND') return 0;
    return wound.count || 1;
}

function negativeStrengthOf(ability: Ability): number {
    let total = 0;
    for (const effect of ability.effects || []) {
        if (effect.type !== 'ADD_TEMP_STAT') continue;
        if (effect.stat !== 'STRENGTH') continue;
        if ((effect.value || 0) >= 0) continue;
        // SELF / BEARER = malus sur soi → hors ciblage ennemi.
        if (effect.target === 'SELF' || effect.target === 'BEARER') continue;
        total += effect.value || 0;
    }
    return total;
}

function wouldWinSides(
    forFp: boolean,
    cStr: number,
    mStr: number
): boolean {
    return forFp ? fpWinsSkirmish(cStr, mStr) : shadowWinsSkirmish(cStr, mStr);
}

/** Cibles d’effet ennemi dans l’escarmouche active. */
function enemySkirmishTargets(
    sides: ActiveSkirmishSides,
    forFp: boolean
): CardState[] {
    return forFp ? sides.minions : [sides.companion];
}

function isEnemyOf(card: CardState, forFp: boolean): boolean {
    if (forFp) return card.kind === 'SHADOW';
    return card.kind === 'FREE_PEOPLE' || card.type === 'COMPANION';
}

/**
 * A5 + C10 — Escarmouche : boost / malus / blessure mortelle seulement si
 * ça retourne un combat perdu. Déjà gagnant → passer.
 */
export function pickSkirmishCombatAction(
    G: GameState,
    playerID: string,
    phase: string
): SkirmishActionPick | null {
    if (!G.actionWindow?.isOpen) return null;
    if ((phase || '').toLowerCase() !== 'skirmish') return null;

    const sides = getActiveSkirmishSides(G);
    if (!sides) return null;

    const forFp = String(playerID) === String(fpPlayerId(G));
    if (wouldWinSides(forFp, sides.companionStr, sides.minionStr)) {
        return null;
    }

    const ourCards = forFp ? [sides.companion] : sides.minions;
    const enemies = enemySkirmishTargets(sides, forFp);

    for (const host of ourCards) {
        for (const { source, ability } of collectVisibleAbilities(G, host)) {
            if (!abilityMatchesPhase(ability, phase)) continue;
            if (abilityTooComplexForBot(ability)) continue;
            if (abilityNeedsCostDesignation(G, source, ability, playerID)) {
                continue;
            }
            if (!canPayAbilityCost(G, source, ability.cost, playerID)) {
                continue;
            }
            if (!abilityHasLegalEffectTarget(G, source, ability, playerID)) {
                continue;
            }

            const boost = selfStrengthBoostFromAbility(ability);
            if (boost > 0) {
                const afterC = forFp
                    ? sides.companionStr + boost
                    : sides.companionStr;
                const afterM = forFp
                    ? sides.minionStr
                    : sides.minionStr + boost;
                if (!wouldWinSides(forFp, afterC, afterM)) continue;
                const sourceInstanceId = source.instanceId || source.id;
                if (!sourceInstanceId || !ability.id) continue;
                return {
                    move: 'activateAbility',
                    args: [sourceInstanceId, ability.id],
                };
            }

            // C10 : blessure mortelle sur un adversaire de l’escarmouche.
            const wounds = woundCountOf(ability);
            if (wounds > 0) {
                const pick = pickLethalSkirmishWoundTarget(
                    G,
                    source,
                    ability,
                    enemies,
                    sides,
                    forFp
                );
                if (!pick) continue;
                const sourceInstanceId = source.instanceId || source.id;
                if (!sourceInstanceId || !ability.id) continue;
                return {
                    move: 'activateAbility',
                    args: abilityNeedsEffectDesignation(G, source, ability)
                        ? [sourceInstanceId, ability.id, pick]
                        : [sourceInstanceId, ability.id],
                };
            }

            // C10 : malus de force ciblé.
            const malus = negativeStrengthOf(ability);
            if (malus < 0) {
                const pick = pickStrengthMalusTarget(
                    G,
                    source,
                    ability,
                    enemies,
                    sides,
                    forFp,
                    malus
                );
                if (!pick) continue;
                const sourceInstanceId = source.instanceId || source.id;
                if (!sourceInstanceId || !ability.id) continue;
                return {
                    move: 'activateAbility',
                    args: abilityNeedsEffectDesignation(G, source, ability)
                        ? [sourceInstanceId, ability.id, pick]
                        : [sourceInstanceId, ability.id],
                };
            }
        }
    }

    // Events main : +force / malus / blessure mortelle.
    const hand = G.players[playerID]?.hand || [];
    const context = { G, ctx: { phase }, playerID };
    for (let index = 0; index < hand.length; index += 1) {
        const card = hand[index];
        if (!card || card.type !== 'EVENT') continue;
        if (forFp && card.kind === 'SHADOW') continue;
        if (!forFp && card.kind === 'FREE_PEOPLE') continue;

        const skirmishAbility = (card.abilities || []).find((ab) =>
            abilityMatchesPhase(ab, 'skirmish')
        );
        if (!skirmishAbility) continue;
        if (abilityTooComplexForBot(skirmishAbility)) continue;
        if (
            abilityNeedsCostDesignation(G, card, skirmishAbility, playerID)
        ) {
            continue;
        }

        const boost = eventStrengthBoostToSkirmisher(skirmishAbility);
        if (boost > 0) {
            const target = forFp ? sides.companion : sides.minions[0];
            if (!target) continue;
            const targetId = companionIdOf(target);
            if (!canPlayCard(card, context, targetId, target).valid) continue;
            const afterC = forFp
                ? sides.companionStr + boost
                : sides.companionStr;
            const afterM = forFp
                ? sides.minionStr
                : sides.minionStr + boost;
            if (!wouldWinSides(forFp, afterC, afterM)) continue;
            return { move: 'playCard', args: [index, targetId] };
        }

        const wounds = woundCountOf(skirmishAbility);
        if (wounds > 0) {
            const pick = pickLethalSkirmishWoundTarget(
                G,
                card,
                skirmishAbility,
                enemies,
                sides,
                forFp
            );
            if (!pick) continue;
            const targetCard = enemies.find(
                (c) => companionIdOf(c) === pick || c.id === pick
            );
            if (
                !canPlayCard(card, context, pick, targetCard || undefined)
                    .valid
            ) {
                continue;
            }
            return { move: 'playCard', args: [index, pick] };
        }

        const malus = negativeStrengthOf(skirmishAbility);
        if (malus < 0) {
            const pick = pickStrengthMalusTarget(
                G,
                card,
                skirmishAbility,
                enemies,
                sides,
                forFp,
                malus
            );
            if (!pick) continue;
            const targetCard = enemies.find(
                (c) => companionIdOf(c) === pick || c.id === pick
            );
            if (
                !canPlayCard(card, context, pick, targetCard || undefined)
                    .valid
            ) {
                continue;
            }
            return { move: 'playCard', args: [index, pick] };
        }
    }

    return null;
}

function pickLethalSkirmishWoundTarget(
    G: GameState,
    source: CardState,
    ability: Ability,
    enemies: CardState[],
    sides: ActiveSkirmishSides,
    forFp: boolean
): string | null {
    const wounds = woundCountOf(ability);
    if (wounds <= 0) return null;
    const candidates = getEffectDesignationCandidates(G, source, ability).filter(
        (c) => enemies.some((e) => companionIdOf(e) === companionIdOf(c))
    );
    // Proper-name / single auto : candidats vides mais légal → prendre l’ennemi unique tuable.
    const pool =
        candidates.length > 0
            ? candidates
            : enemies.filter((e) => getEffectiveVitality(e) <= wounds);

    let bestId: string | null = null;
    let bestStr = -Infinity;
    for (const target of pool) {
        if (getEffectiveVitality(target) > wounds) continue;
        const removed = getCalculatedStrength(G, target);
        const afterC = forFp
            ? sides.companionStr
            : Math.max(0, sides.companionStr - removed);
        const afterM = forFp
            ? Math.max(0, sides.minionStr - removed)
            : sides.minionStr;
        if (!wouldWinSides(forFp, afterC, afterM)) continue;
        if (removed > bestStr) {
            bestStr = removed;
            bestId = companionIdOf(target);
        }
    }
    return bestId;
}

function pickStrengthMalusTarget(
    G: GameState,
    source: CardState,
    ability: Ability,
    enemies: CardState[],
    sides: ActiveSkirmishSides,
    forFp: boolean,
    malus: number
): string | null {
    if (malus >= 0) return null;
    const candidates = getEffectDesignationCandidates(G, source, ability).filter(
        (c) => enemies.some((e) => companionIdOf(e) === companionIdOf(c))
    );
    const pool = candidates.length > 0 ? candidates : enemies;
    // Malus fixe : n’importe quelle cible ennemie de l’escarmouche suffit.
    for (const target of pool) {
        const afterC = forFp ? sides.companionStr : sides.companionStr + malus;
        const afterM = forFp ? sides.minionStr + malus : sides.minionStr;
        if (!wouldWinSides(forFp, afterC, afterM)) continue;
        return companionIdOf(target);
    }
    return null;
}

/**
 * C9 light — Manœuvre / archerie : tuer un adversaire (blessure mortelle)
 * si le coût est simple (pas de désignation de coût / choix).
 */
export function pickGreedyPhaseWoundAction(
    G: GameState,
    playerID: string,
    phase: string
): SkirmishActionPick | null {
    if (!G.actionWindow?.isOpen) return null;
    const p = (phase || '').toLowerCase();
    if (p !== 'maneuver' && p !== 'archery') return null;

    const forFp = String(playerID) === String(fpPlayerId(G));
    const fp = fpPlayerId(G);
    const ourHosts = forFp
        ? [
              ...(G.players[fp]?.fellowshipArea || []),
              ...(G.players[fp]?.supportArea || []),
          ]
        : [
              ...(G.battlefield || []),
              ...(G.players[playerID]?.supportArea || []),
          ];

    let best: { pick: SkirmishActionPick; score: number } | null = null;

    const considerLethal = (
        source: CardState,
        ability: Ability,
        build: (targetId: string | null) => SkirmishActionPick | null
    ) => {
        if (!abilityMatchesPhase(ability, phase)) return;
        if (abilityTooComplexForBot(ability)) return;
        if (abilityNeedsCostDesignation(G, source, ability, playerID)) return;
        if (!canPayAbilityCost(G, source, ability.cost, playerID)) return;
        if (!abilityHasLegalEffectTarget(G, source, ability, playerID)) return;
        const wounds = woundCountOf(ability);
        if (wounds <= 0) return;

        const candidates = getEffectDesignationCandidates(
            G,
            source,
            ability
        ).filter((c) => isEnemyOf(c, forFp) && !isRingBearerCard(c));
        for (const target of candidates) {
            if (getEffectiveVitality(target) > wounds) continue;
            // Ne pas tuer notre propre camp (filtre kind déjà fait).
            const score =
                getCalculatedStrength(G, target) * 10 +
                (target.type === 'MINION' ? 5 : 0);
            const needs = abilityNeedsEffectDesignation(G, source, ability);
            const move = build(needs ? companionIdOf(target) : null);
            if (!move) continue;
            if (!best || score > best.score) {
                best = { pick: move, score };
            }
        }
    };

    for (const host of ourHosts) {
        if (!host || host.isDead) continue;
        for (const { source, ability } of collectVisibleAbilities(G, host)) {
            considerLethal(source, ability, (targetId) => {
                const sourceInstanceId = source.instanceId || source.id;
                if (!sourceInstanceId || !ability.id) return null;
                return {
                    move: 'activateAbility',
                    args: targetId
                        ? [sourceInstanceId, ability.id, targetId]
                        : [sourceInstanceId, ability.id],
                };
            });
        }
    }

    const hand = G.players[playerID]?.hand || [];
    const context = { G, ctx: { phase }, playerID };
    for (let index = 0; index < hand.length; index += 1) {
        const card = hand[index];
        if (!card || card.type !== 'EVENT') continue;
        if (forFp && card.kind === 'SHADOW') continue;
        if (!forFp && card.kind === 'FREE_PEOPLE') continue;
        const ab = (card.abilities || []).find((a) =>
            abilityMatchesPhase(a, phase)
        );
        if (!ab) continue;
        considerLethal(card, ab, (targetId) => {
            if (!targetId) {
                if (!canPlayCard(card, context).valid) return null;
                return { move: 'playCard', args: [index] };
            }
            const target = findTargetCard(G, targetId) as CardState | null;
            if (!canPlayCard(card, context, targetId, target || undefined).valid) {
                return null;
            }
            return { move: 'playCard', args: [index, targetId] };
        });
    }

    return best?.pick ?? null;
}

/**
 * Fenêtre d’action : escarmouche (A5/C10) ou manœuvre/archerie (C9 light).
 */
export function pickActionWindowMove(
    G: GameState,
    playerID: string,
    phase: string
): SkirmishActionPick | null {
    const p = (phase || '').toLowerCase();
    if (p === 'skirmish') {
        return pickSkirmishCombatAction(G, playerID, phase);
    }
    if (p === 'maneuver' || p === 'archery') {
        return pickGreedyPhaseWoundAction(G, playerID, phase);
    }
    return null;
}
