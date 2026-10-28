import type { Ability, CardState, GameState } from '../../types';
import { applyAbilityEffect } from './applyAbilityEffect';
import { payAbilityCost } from './payAbilityCost';
import { collectCardAbilities } from './collectAbilities';
import {
    forEachInPlayCard,
    resolveCostTarget,
} from './resolveCostTarget';
import { skirmishMatchesInvolving } from './cancelSkirmish';
import { isRingBearerCard } from '../../../utils/cardUtils';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { findForcedChoiceSource } from './startOfManeuver';

function abilityHasChooseOne(ability: Ability): boolean {
    return (ability.effects || []).some((e) => e.type === 'CHOOSE_ONE');
}

function openForcedChoice(
    G: GameState,
    source: CardState,
    ability: Ability,
    skirmishId: string
): void {
    const sourceInstanceId = source.instanceId || source.id;
    if (!sourceInstanceId) return;
    const fpId = G.fpPlayerId || '0';
    const choose = (ability.effects || []).find((e) => e.type === 'CHOOSE_ONE');
    G.pendingForcedChoice = {
        playerId: fpId,
        sourceInstanceId,
        abilityId: ability.id,
        skirmishId,
        ...(choose && choose.type === 'CHOOSE_ONE'
            ? {
                  options: choose.options.map((o) => ({
                      label: o.label,
                      effects: o.effects,
                  })),
              }
            : {}),
    };
    G.statusMessage =
        'Contrainte du Porteur : choisissez une option pour commencer ce combat.';
}

/**
 * « At the start of each skirmish involving X… » — appliqué quand le combat
 * devient actif (selectSkirmish), pas à l’entrée de phase startOfSkirmish.
 * Retourne true si un choix forcé bloque encore la fenêtre d’actions.
 */
export function applyStartOfSkirmishTriggers(
    G: GameState,
    skirmishId: string
): boolean {
    const skirmish = (G.skirmishes || []).find((s) => s.id === skirmishId);
    if (!skirmish) return false;

    forEachInPlayCard(G, (card) => {
        for (const { source, ability } of collectCardAbilities(card)) {
            if (ability.trigger?.type !== 'START_OF_SKIRMISH') continue;
            if (
                !skirmishMatchesInvolving(
                    G,
                    skirmish,
                    source,
                    ability.trigger.involving
                )
            ) {
                continue;
            }
            if (
                ability.trigger.whileRingBearer &&
                !isRingBearerCard(source)
            ) {
                continue;
            }
            if (abilityHasChooseOne(ability)) {
                if (!G.pendingForcedChoice) {
                    openForcedChoice(G, source, ability, skirmishId);
                }
                continue;
            }
            applyAbilityEffect(G, source, ability);
        }
    });

    return Boolean(G.pendingForcedChoice);
}

/** Applique l’option choisie d’un `pendingForcedChoice`. */
export function resolveForcedChoice(
    G: GameState,
    playerID: string,
    optionIndex: number,
    discardedHandIds?: string[],
    exertTargetIds?: string[]
): boolean {
    const pending = G.pendingForcedChoice;
    if (!pending || pending.playerId !== playerID) return false;

    const source = findForcedChoiceSource(G, pending.sourceInstanceId);
    const ability = source?.abilities?.find((ab) => ab.id === pending.abilityId);
    const optionFromSnapshot = pending.options?.[optionIndex];
    const choose = ability?.effects?.find((e) => e.type === 'CHOOSE_ONE');
    const option =
        optionFromSnapshot ||
        (choose && choose.type === 'CHOOSE_ONE'
            ? choose.options[optionIndex]
            : undefined);
    if (!source || !option) {
        G.pendingForcedChoice = undefined;
        return false;
    }

    const needsExert = option.effects.find(
        (e) =>
            e.type === 'EXERT' &&
            typeof e.multiCount === 'number' &&
            e.multiCount > 1
    );
    if (needsExert && needsExert.type === 'EXERT') {
        const need = needsExert.multiCount || 0;
        const pool = resolveCostTarget(G, source, needsExert.target).filter(
            (card) =>
                Boolean(card) &&
                !card.isDead &&
                getEffectiveVitality(card) > (needsExert.count || 1)
        );
        if (pool.length < need) {
            // Option illégale : pas assez de compagnons exerçables.
            return false;
        }
        if (!exertTargetIds || exertTargetIds.length !== need) {
            // Premier clic : mémoriser l’option, l’UI demandera la désignation.
            G.pendingForcedChoice = {
                ...pending,
                pendingOptionIndex: optionIndex,
                needsExertTargets: need,
            };
            G.statusMessage = `Choisissez ${need} compagnons à affaiblir.`;
            return true;
        }
        if (new Set(exertTargetIds).size !== exertTargetIds.length) {
            return false;
        }
    }

    const needsHand = option.effects.find(
        (e) => e.type === 'DISCARD_FROM_HAND'
    );
    if (
        needsHand &&
        needsHand.type === 'DISCARD_FROM_HAND' &&
        !needsHand.upTo
    ) {
        const need = needsHand.count || 0;
        const handSize = G.players[playerID]?.hand?.length || 0;
        if (handSize < need && !discardedHandIds) {
            // Option illégale : pas assez de cartes.
            return false;
        }
        if (!discardedHandIds || discardedHandIds.length !== need) {
            // Premier clic : mémoriser l’option, l’UI demandera la défausse.
            G.pendingForcedChoice = {
                ...pending,
                pendingOptionIndex: optionIndex,
                needsHandDiscard: need,
            };
            G.statusMessage = `Choisissez ${need} carte${need > 1 ? 's' : ''} de votre main à défausser.`;
            return true;
        }
    }

    if (pending.unpaidCost && pending.unpaidCost.length > 0) {
        if (
            !payAbilityCost(
                G,
                source,
                pending.unpaidCost,
                pending.costChosenTargetId,
                pending.costDiscardedHandIds,
                undefined,
                pending.actingPlayerId
            )
        ) {
            return false;
        }
    }

    const synthetic: Ability = {
        id: ability?.id || pending.abilityId,
        phases: ability?.phases || [],
        cost: [],
        effects: option.effects,
        source: ability?.source || 'SELF',
        text: ability?.text || '',
    };
    if (
        !applyAbilityEffect(
            G,
            source,
            synthetic,
            exertTargetIds,
            discardedHandIds
        )
    ) {
        return false;
    }

    G.pendingForcedChoice = undefined;
    if (G.pendingEvent?.type === 'LOSES_SKIRMISH') {
        G.pendingEvent = undefined;
    }
    return true;
}

/** Annule un choix d’effet optionnel (Échap) : le coût n’a pas encore été payé. */
export function cancelForcedChoice(
    G: GameState,
    playerID: string
): boolean {
    const pending = G.pendingForcedChoice;
    if (!pending?.cancelable || pending.playerId !== playerID) {
        return false;
    }
    G.pendingForcedChoice = undefined;
    G.statusMessage = 'Action annulée.';
    return true;
}

export function openSkirmishActionWindow(G: GameState): void {
    const fpId = G.fpPlayerId || '0';
    if (!G.activeSkirmishId) return;
    G.actionWindow = {
        isOpen: true,
        activePlayerId: fpId,
        title: 'ESCARMOUCHE',
        message:
            'Phase d’actions de Skirmish : Jouez des cartes/effets ou PASSER.',
        canPass: true,
        passesCount: 0,
    };
}
