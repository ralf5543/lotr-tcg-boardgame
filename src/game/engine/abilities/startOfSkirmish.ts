import type { Ability, CardState, GameState } from '../../types';
import { applyAbilityEffect } from './applyAbilityEffect';
import { collectCardAbilities } from './collectAbilities';
import { forEachInPlayCard } from './resolveCostTarget';
import { skirmishMatchesInvolving } from './cancelSkirmish';
import { isRingBearerCard } from '../../../utils/cardUtils';
import { findTargetCard } from '../../../utils/cardUtils';

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
    G.pendingForcedChoice = {
        playerId: fpId,
        sourceInstanceId,
        abilityId: ability.id,
        skirmishId,
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
    optionIndex: number
): boolean {
    const pending = G.pendingForcedChoice;
    if (!pending || pending.playerId !== playerID) return false;

    const source = findTargetCard(
        G,
        pending.sourceInstanceId
    ) as CardState | null;
    const ability = source?.abilities?.find((ab) => ab.id === pending.abilityId);
    if (!source || !ability) {
        G.pendingForcedChoice = undefined;
        return false;
    }

    const choose = (ability.effects || []).find((e) => e.type === 'CHOOSE_ONE');
    if (!choose || choose.type !== 'CHOOSE_ONE') {
        G.pendingForcedChoice = undefined;
        return false;
    }
    const option = choose.options[optionIndex];
    if (!option) return false;

    const synthetic: Ability = {
        ...ability,
        effects: option.effects,
    };
    if (!applyAbilityEffect(G, source, synthetic)) {
        return false;
    }

    G.pendingForcedChoice = undefined;
    if (G.pendingEvent?.type === 'LOSES_SKIRMISH') {
        G.pendingEvent = undefined;
    }
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
