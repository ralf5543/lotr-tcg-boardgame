// src/game/engine/canUseAbility.ts

import type { CardState, GameState } from '../types';
import { getKeywordValue } from './keywords/keywordUtils';
import { isSkirmishActionWindowOpen } from './skirmishActionWindow';
import { canActInActionWindow } from './actionWindow';
import {
    abilityMatchesPhase,
    collectProjectedAbilities,
} from './abilities/collectAbilities';
import { canPayAbilityCost } from './abilities/payAbilityCost';
import { abilityHasLegalEffectTarget } from './abilities/designation';
import { abilityMeetsPlayRestrictions } from './abilities/abilityRestrictions';
import {
    abilityMatchesTrigger,
    isResponseWindowOpen,
} from './responseWindow';
export interface ValidationContext {
    G: GameState;
    ctx: { phase?: string; currentPlayer?: string };
    playerID: string;
}

export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

/**
 * Vérifie si une carte DÉJÀ EN JEU (ou un attachement) peut utiliser un effet / capacité / mot-clé.
 */
export function canUseAbility(
    card: CardState,
    context: ValidationContext
): ValidationResult {
    const { ctx, playerID, G } = context;
    const rawPhase = ctx.phase || '';
    const currentPhase = rawPhase.toUpperCase();
    // camelCase boardgame.io ("startOfRegroup") → SNAKE_CASE ("START_OF_REGROUP")
    const normalizedPhase = rawPhase
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase();
    const fpPlayerId = G.fpPlayerId || '0';

    // 1. Contrôle du joueur (Peuples Libres vs Ombre)
    if (card.kind === 'FREE_PEOPLE' && playerID !== fpPlayerId) {
        return {
            valid: false,
            reason: 'Seul le joueur des Peuples Libres peut utiliser cette capacité.',
        };
    }
    if (card.kind === 'SHADOW' && playerID === fpPlayerId) {
        return {
            valid: false,
            reason: "Seul le joueur de l'Ombre peut utiliser cette capacité.",
        };
    }

    if (isResponseWindowOpen(G)) {
        if (!canActInActionWindow(G, playerID)) {
            return {
                valid: false,
                reason: "Ce n'est pas à vous de répondre.",
            };
        }
        const ownMatch = (card.abilities || []).some(
            (ability) =>
                abilityMatchesPhase(ability, 'RESPONSE') &&
                abilityMatchesTrigger(ability, G.pendingEvent, card, G) &&
                canPayAbilityCost(G, card, ability.cost)
        );
        if (ownMatch) return { valid: true };

        const attachmentMatch = (card.attachments || []).some((att) =>
            (att.abilities || []).some(
                (ability) =>
                    abilityMatchesPhase(ability, 'RESPONSE') &&
                    abilityMatchesTrigger(ability, G.pendingEvent, att, G) &&
                    canPayAbilityCost(G, att, ability.cost)
            )
        );
        if (attachmentMatch) return { valid: true };

        const projectedMatch = collectProjectedAbilities(G, card).some(
            ({ source, ability }) =>
                abilityMatchesPhase(ability, 'RESPONSE') &&
                abilityMatchesTrigger(ability, G.pendingEvent, source, G) &&
                canPayAbilityCost(G, source, ability.cost)
        );
        if (projectedMatch) return { valid: true };
        return {
            valid: false,
            reason: 'Aucune réponse éligible sur cette carte.',
        };
    }

    // 2. Traitement du mot-clé MUSTER en phase START_OF_REGROUP / REGROUP
    if (
        currentPhase === 'START_OF_REGROUP' ||
        currentPhase === 'REGROUP' ||
        normalizedPhase === 'START_OF_REGROUP' ||
        normalizedPhase === 'REGROUP'
    ) {
        const hasMuster = getKeywordValue(card, 'MUSTER') >= 0;
        if (hasMuster) {
            return { valid: true };
        }
    }

    // Pendant l'attribution des blessures d'archerie (FP puis Ombre), plus aucune action.
    if (
        (currentPhase === 'ARCHERY' || normalizedPhase === 'ARCHERY') &&
        G.archeryState?.step &&
        G.archeryState.step !== 'ACTIONS'
    ) {
        return {
            valid: false,
            reason: "Les capacités d'archerie ne sont plus jouables pendant l'attribution des flèches.",
        };
    }

    if (
        (currentPhase === 'ASSIGNMENT' || normalizedPhase === 'ASSIGNMENT') &&
        G.assignmentStep !== 'ACTIONS'
    ) {
        return {
            valid: false,
            reason: 'Les actions d’affectation se jouent avant l’attribution des séides.',
        };
    }

    const projectedForPhase = collectProjectedAbilities(G, card).some(
        ({ ability }) => abilityMatchesPhase(ability, rawPhase)
    );

    // 3. Traitement des capacités avec phases explicites (actionPhases)
    //    — carte OU attachements (Anneau Unique en combat, etc.)
    const ownActionPhases = (card.actionPhases || []).map((p) =>
        p.toUpperCase()
    );
    const attachmentActionPhases = (card.attachments || []).flatMap((att) =>
        (att.actionPhases || []).map((p) => p.toUpperCase())
    );
    const allowedActionPhases = [
        ...new Set([...ownActionPhases, ...attachmentActionPhases]),
    ];

    if (allowedActionPhases.length > 0) {
        const ownPhaseOk =
            allowedActionPhases.includes(currentPhase) ||
            allowedActionPhases.includes(normalizedPhase);

        if (!ownPhaseOk && !projectedForPhase) {
            return {
                valid: false,
                reason: `Cette capacité ne peut être activée qu'en phase : ${[
                    ...(card.actionPhases || []),
                    ...(card.attachments || []).flatMap(
                        (att) => att.actionPhases || []
                    ),
                ].join(', ')}.`,
            };
        }

        if (ownPhaseOk) {
            if (
                (currentPhase === 'SKIRMISH' ||
                    normalizedPhase === 'SKIRMISH') &&
                allowedActionPhases.includes('SKIRMISH') &&
                !isSkirmishActionWindowOpen(G)
            ) {
                return {
                    valid: false,
                    reason: 'Les actions de combat ne peuvent être utilisées que pendant une escarmouche en cours.',
                };
            }

            if (!canActInActionWindow(G, playerID)) {
                return {
                    valid: false,
                    reason: "Ce n'est pas à vous d'agir.",
                };
            }
            const phaseAbilities = (card.abilities || []).filter(
                (ability) =>
                    abilityMatchesPhase(ability, rawPhase) &&
                    abilityMeetsPlayRestrictions(G, card, ability)
            );
            const attachmentPhaseAbilities = (card.attachments || []).flatMap(
                (att) =>
                    (att.abilities || [])
                        .filter(
                            (ability) =>
                                abilityMatchesPhase(ability, rawPhase) &&
                                abilityMeetsPlayRestrictions(G, att, ability)
                        )
                        .map((ability) => ({ att, ability }))
            );
            const hasAnyAbility =
                (card.abilities || []).length > 0 ||
                (card.attachments || []).some(
                    (att) => (att.abilities || []).length > 0
                );

            if (hasAnyAbility) {
                if (
                    phaseAbilities.length === 0 &&
                    attachmentPhaseAbilities.length === 0 &&
                    !projectedForPhase
                ) {
                    return {
                        valid: false,
                        reason: 'Aucune capacité activable pour cette carte dans la phase actuelle.',
                    };
                }
                if (
                    phaseAbilities.length > 0 &&
                    !phaseAbilities.some((ability) =>
                        abilityHasLegalEffectTarget(G, card, ability)
                    ) &&
                    attachmentPhaseAbilities.length === 0
                ) {
                    return {
                        valid: false,
                        reason: 'Aucune cible légale pour cette capacité.',
                    };
                }
                if (
                    attachmentPhaseAbilities.length > 0 &&
                    !attachmentPhaseAbilities.some(({ att, ability }) =>
                        abilityHasLegalEffectTarget(G, att, ability)
                    ) &&
                    phaseAbilities.length === 0
                ) {
                    return {
                        valid: false,
                        reason: 'Aucune cible légale pour cette capacité.',
                    };
                }
                if (
                    phaseAbilities.length > 0 ||
                    attachmentPhaseAbilities.length > 0
                ) {
                    return { valid: true };
                }
            } else {
                return { valid: true };
            }
        }
    }

    const hasMatchingAbility = (card.abilities || []).some(
        (ability) =>
            abilityMatchesPhase(ability, rawPhase) &&
            abilityHasLegalEffectTarget(G, card, ability)
    );
    if (hasMatchingAbility || projectedForPhase) {
        if (
            (currentPhase === 'SKIRMISH' || normalizedPhase === 'SKIRMISH') &&
            !isSkirmishActionWindowOpen(G)
        ) {
            return {
                valid: false,
                reason: 'Les actions de combat ne peuvent être utilisées que pendant une escarmouche en cours.',
            };
        }
        if (!canActInActionWindow(G, playerID)) {
            return {
                valid: false,
                reason: "Ce n'est pas à vous d'agir.",
            };
        }
        return { valid: true };
    }

    return {
        valid: false,
        reason: 'Aucune capacité activable pour cette carte dans la phase actuelle.',
    };
}
