import type {
    Ability,
    AbilityTargetRef,
    CardState,
    GameState,
} from '../types';
import {
    findBearer,
    resolveCostTarget,
} from '../engine/abilities/resolveCostTarget';
import { cardMatchesTarget } from '../engine/validations/matchers';

/**
 * Plafond de blessures dans une escarmouche
 * (« may take no more than 1 wound in a skirmish », Armure de Pippin).
 *
 * Conditions « tant que… » évaluées ici : repérage (`spot`) et port
 * (`bearing`) — les seules émises avec cet effet. Toute autre condition
 * sur le déclencheur rend le plafond inapplicable (inerte plutôt que faux).
 */
function whileConditionHoldsForLimit(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    const trigger = ability.trigger;
    if (!trigger || trigger.type !== 'WHILE') return false;
    if (
        trigger.spotTwilight ||
        trigger.spotCultureTokens ||
        trigger.matchingTokensOnNamedCard ||
        trigger.skirmishing ||
        trigger.atSiteKeyword ||
        trigger.unlessAtSiteKeyword ||
        trigger.spotSiteKeyword ||
        trigger.noOpponentControlsSite ||
        trigger.stackedOnControlledSite ||
        trigger.atAttachedSite ||
        trigger.spotBurdensOrRingBearerWounds ||
        trigger.hasInitiative ||
        trigger.cannotSpotThreats ||
        trigger.inRegion ||
        trigger.moreCompanionsThanMinions ||
        trigger.controlThisSite ||
        trigger.spotAny
    ) {
        return false;
    }
    for (const req of trigger.spot || []) {
        const count = req.count || 1;
        if (resolveCostTarget(G, source, req.target).length < count) {
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
    return true;
}

function beneficiaryMatches(
    G: GameState,
    source: CardState,
    target: AbilityTargetRef,
    card: CardState
): boolean {
    if (target === 'SELF') return source === card;
    if (target === 'BEARER') return findBearer(G, source) === card;
    if (Array.isArray(target)) return cardMatchesTarget(card, target);
    return false;
}

/** L’escarmouche active implique-t-elle cette carte ? */
export function isInActiveSkirmish(G: GameState, card: CardState): boolean {
    if (!G.activeSkirmishId) return false;
    const skirmish = (G.skirmishes || []).find(
        (s) => s.id === G.activeSkirmishId
    );
    if (!skirmish) return false;
    const id = card.instanceId || card.id;
    if (!id) return false;
    if (skirmish.companionId === id) return true;
    return (skirmish.minionIds || []).includes(id);
}

/**
 * Plafond de blessures pour cette carte dans l’escarmouche active
 * (`null` = aucun plafond). Sources : la carte et ses attachements.
 */
export function getSkirmishWoundLimit(
    G: GameState,
    card: CardState
): number | null {
    if (!card || card.isDead) return null;
    if (!isInActiveSkirmish(G, card)) return null;

    let limit: number | null = null;
    const sources = [card, ...(card.attachments || []).filter(Boolean)];
    for (const source of sources) {
        for (const ability of source.abilities || []) {
            if (!whileConditionHoldsForLimit(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'LIMIT_WOUNDS_IN_SKIRMISH') continue;
                if (!beneficiaryMatches(G, source, effect.target, card)) {
                    continue;
                }
                const max = Math.max(0, effect.max || 0);
                limit = limit === null ? max : Math.min(limit, max);
            }
        }
    }
    return limit;
}

/** Blessures déjà prises par la carte dans l’escarmouche donnée. */
export function skirmishWoundsTaken(
    card: CardState,
    skirmishId: string | undefined
): number {
    if (!skirmishId) return 0;
    if (card.skirmishWounds?.skirmishId !== skirmishId) return 0;
    return card.skirmishWounds.count || 0;
}
