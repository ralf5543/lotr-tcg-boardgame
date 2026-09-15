import type { Ability, CardState, GameState } from '../../../types';
import { resolveCostTarget, findBearer } from '../../../engine/abilities/resolveCostTarget';

function matchCard(card: CardState, targetId: string): boolean {
    return card.instanceId === targetId || card.id === targetId;
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

    return Boolean(trigger.spotTwilight || (trigger.spot && trigger.spot.length));
}

/**
 * Bonus de force issus des passifs While sur la carte (ou ses attachements).
 */
export function getWhileStrengthBonus(
    G: GameState,
    card: CardState
): number {
    const cardId = card.instanceId || card.id;
    let bonus = 0;

    const consider = (source: CardState) => {
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;

            for (const effect of ability.effects || []) {
                if (effect.type !== 'MODIFY_STAT') continue;
                if (effect.stat !== 'STRENGTH') continue;

                let beneficiary: CardState | null = null;
                if (effect.target === 'SELF') {
                    beneficiary = source;
                } else if (effect.target === 'BEARER') {
                    beneficiary = findBearer(G, source);
                }
                if (!beneficiary || !matchCard(beneficiary, cardId)) continue;
                bonus += effect.value || 0;
            }
        }
    };

    consider(card);
    for (const att of card.attachments || []) {
        if (att) consider(att);
    }

    return bonus;
}
