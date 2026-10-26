import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { resolveCostTarget } from '../engine/abilities/resolveCostTarget';
import {
    getDeckOrDiscardPlayCandidates,
    getHandPlayCandidates,
} from './playFromOutOfPlay';
import { getCurrentSite } from './sites';

/**
 * Capacités de phase de site trop maladroites en projection
 * (Shores : Spot N → prevent move again ; famille « Shadow: play… »).
 * Entorse UX : toaster dès que l’action est légale ; Passer = plus d’offre
 * jusqu’à la prochaine phase d’Ombre. Les capacités « play… » sont
 * ré-offertes après chaque activation réussie (actions répétables).
 */

function siteInstanceKey(site: SiteCardState): string {
    return (
        (site as SiteCardState & { instanceId?: string }).instanceId || site.id
    );
}

function shadowPlayerId(G: GameState): string {
    const fpId = G.fpPlayerId || '0';
    return fpId === '0' ? '1' : '0';
}

/** Famille « Shadow: play… » : jouer une carte fait partie de l’action. */
export function isSitePhasePlayFamilyAbility(ability: Ability): boolean {
    return (ability.effects || []).some(
        (e) =>
            e.type === 'PLAY_FROM_HAND' || e.type === 'PLAY_FROM_DECK_OR_DISCARD'
    );
}

/** Capacité site Ombre → toaster (pas de bulle sur les séides). */
export function isSitePhaseToasterAbility(ability: Ability): boolean {
    const phases = (ability.phases || []).map((p) => p.toUpperCase());
    if (!phases.includes('SHADOW')) return false;
    if (ability.trigger) return false;

    // Famille « Shadow: play… » (Angle / Buckland / Marshland / Woody-End).
    if (isSitePhasePlayFamilyAbility(ability)) return true;

    // Slopes : −crépuscule + défausse main → pioche.
    // Angle mode B : désigner N (condition) + défausse main → pioche.
    const hasDraw = (ability.effects || []).some((e) => e.type === 'DRAW');
    if (hasDraw) {
        const cost = ability.cost?.[0];
        if (!cost) return false;
        const discardsHand =
            typeof cost.discardFromHand === 'number' &&
            cost.discardFromHand > 0;
        if (!discardsHand) return false;
        const removesTwilight =
            typeof cost.removeTwilight === 'number' && cost.removeTwilight > 0;
        const spotsCondition = Boolean(
            cost.spot?.some(
                (s) => s.mode === 'CONDITION' && Array.isArray(s.target)
            )
        );
        return removesTwilight || spotsCondition;
    }

    const hasPrevent = (ability.effects || []).some(
        (e) => e.type === 'PREVENT_MOVE_AGAIN'
    );
    if (!hasPrevent) return false;
    // Spot condition sans désignation (pas d’exert / pas de COST_TARGET).
    const hasExert = Boolean(ability.cost?.[0]?.exert?.length);
    if (hasExert) return false;
    const needsCostTarget = (ability.effects || []).some(
        (e) => 'target' in e && e.target === 'COST_TARGET'
    );
    if (needsCostTarget) return false;
    return Boolean(
        ability.cost?.[0]?.spot?.some((s) => Array.isArray(s.target))
    );
}

/** L’action du site est-elle légale maintenant pour l’Ombre ? */
export function isSitePhaseAbilityEligible(
    G: GameState,
    site: SiteCardState,
    ability: Ability
): boolean {
    const shadowId = shadowPlayerId(G);
    const shadow = G.players[shadowId];

    // Expanding Marshland : séides en jeu + crépuscule ≤ seuil.
    if (
        typeof ability.requiresMinionsPlusTwilightAtMost === 'number'
    ) {
        const minions = (G.battlefield || []).filter(
            (c) => c && c.type === 'MINION' && !c.isDead
        ).length;
        if (
            minions + (G.twilightPool || 0) >
            ability.requiresMinionsPlusTwilightAtMost
        ) {
            return false;
        }
    }

    // DRAW : pioche Ombre — il faut au moins une carte en pioche.
    const draws = (ability.effects || []).some((e) => e.type === 'DRAW');
    if (draws && (!shadow?.deck || shadow.deck.length === 0)) return false;

    const source = site as unknown as CardState;
    if (!canPayAbilityCost(G, source, ability.cost, shadowId)) {
        return false;
    }

    for (const effect of ability.effects || []) {
        if (effect.type === 'PLAY_FROM_HAND') {
            if (
                getHandPlayCandidates(
                    G,
                    shadowId,
                    effect.target,
                    'shadow',
                    effect.twilightReduce || 0
                ).length === 0
            ) {
                return false;
            }
        }
        if (effect.type === 'PLAY_FROM_DECK_OR_DISCARD') {
            const from = effect.from || 'DECK_OR_DISCARD';
            if (
                getDeckOrDiscardPlayCandidates(
                    G,
                    shadowId,
                    effect.target,
                    'shadow',
                    null,
                    from
                ).length === 0
            ) {
                return false;
            }
        }
        // Effet désigné après le jeu (Buckland) : il faut une cible en jeu.
        if (
            effect.type === 'DISCARD' &&
            !effect.chooser &&
            Array.isArray(effect.target)
        ) {
            if (resolveCostTarget(G, source, effect.target).length === 0) {
                return false;
            }
        }
    }
    return true;
}

/** Capacités du site courant offerte(s) à l’Ombre via le toaster. */
export function getEligibleSitePhaseAbilities(
    G: GameState
): { site: SiteCardState; ability: Ability }[] {
    if (G.preventMoveAgain) return [];
    const site = getCurrentSite(G);
    if (!site?.abilities?.length) return [];
    return site.abilities
        .filter((ability) => isSitePhaseToasterAbility(ability))
        .filter((ability) => isSitePhaseAbilityEligible(G, site, ability))
        .map((ability) => ({ site, ability }));
}

export function findOptionalSitePhaseAbility(
    G: GameState
): { site: SiteCardState; ability: Ability } | null {
    if (G.pendingSitePhaseAbility) return null;
    if (G.sitePhaseAbilityOfferedThisPhase) return null;
    const eligible = getEligibleSitePhaseAbilities(G);
    return eligible[0] || null;
}

/** Ouvre le toaster si Spot légal et pas encore proposé ce tour de phase. */
export function beginOptionalSitePhaseAbility(G: GameState): boolean {
    if (G.pendingSitePhaseAbility) return true;
    const found = findOptionalSitePhaseAbility(G);
    if (!found) return false;
    G.pendingSitePhaseAbility = {
        playerId: shadowPlayerId(G),
        siteInstanceId: siteInstanceKey(found.site),
        abilityId: found.ability.id,
    };
    G.statusMessage =
        'Ombre : vous pouvez utiliser l’effet du site (Spot requis).';
    return true;
}

export function resolvePendingSitePhaseAbility(
    G: GameState,
    playerID: string,
    accept: boolean,
    discardedHandIds?: string[],
    chosenTargetId?: string,
    chosenAbilityId?: string
): boolean {
    const pending = G.pendingSitePhaseAbility;
    if (!pending || pending.playerId !== playerID) return false;

    if (!accept) {
        G.sitePhaseAbilityOfferedThisPhase = true;
        G.pendingSitePhaseAbility = undefined;
        G.statusMessage = 'Ombre : effet du site décliné.';
        return true;
    }

    const site = getCurrentSite(G);
    if (!site || siteInstanceKey(site) !== pending.siteInstanceId) {
        return false;
    }

    let ability = site.abilities?.find((ab) => ab.id === pending.abilityId);
    if (chosenAbilityId && chosenAbilityId !== pending.abilityId) {
        const chosen = getEligibleSitePhaseAbilities(G).find(
            (entry) => entry.ability.id === chosenAbilityId
        );
        if (!chosen) return false;
        ability = chosen.ability;
    }
    if (!ability) return false;

    const source = site as unknown as CardState;
    if (!canPayAbilityCost(G, source, ability.cost, playerID)) {
        return false;
    }
    if (
        !payAbilityCost(
            G,
            source,
            ability.cost,
            undefined,
            discardedHandIds,
            undefined,
            playerID
        )
    ) {
        return false;
    }
    if (
        !applyAbilityEffect(
            G,
            source,
            ability,
            chosenTargetId,
            undefined,
            undefined,
            playerID
        )
    ) {
        return false;
    }

    G.pendingSitePhaseAbility = undefined;
    G.statusMessage = `${site.name || 'Le site'} : effet appliqué.`;

    if (isSitePhasePlayFamilyAbility(ability)) {
        // Action répétable : ré-offrir si elle reste légale (sauf si une
        // désignation d’effet est en cours — Buckland).
        if (!G.pendingSitePhaseDesignation) {
            beginOptionalSitePhaseAbility(G);
        }
    } else {
        // Une seule offre par phase d’Ombre, Activer ou Passer (Shores / Slopes).
        G.sitePhaseAbilityOfferedThisPhase = true;
    }
    return true;
}

/** Candidats de la désignation reportée (Buckland : situation à défausser). */
export function getSitePhaseDesignationCandidates(G: GameState): CardState[] {
    const pending = G.pendingSitePhaseDesignation;
    if (!pending) return [];
    const site = getCurrentSite(G);
    const ability = site?.abilities?.find(
        (ab) => ab.id === pending.abilityId
    );
    if (!site || !ability) return [];
    const effect = (ability.effects || [])[pending.effectIndex];
    if (!effect || !('target' in effect) || !Array.isArray(effect.target)) {
        return [];
    }
    return resolveCostTarget(
        G,
        site as unknown as CardState,
        effect.target
    );
}

/** Buckland : le joueur qui active désigne la cible de l’effet reporté. */
export function resolvePendingSitePhaseDesignation(
    G: GameState,
    playerID: string,
    cardId: string
): boolean {
    const pending = G.pendingSitePhaseDesignation;
    if (!pending || pending.playerId !== playerID) return false;

    const site = getCurrentSite(G);
    if (!site || siteInstanceKey(site) !== pending.siteInstanceId) {
        return false;
    }
    const ability = site.abilities?.find(
        (ab) => ab.id === pending.abilityId
    );
    if (!ability) return false;

    const candidates = getSitePhaseDesignationCandidates(G);
    if (
        !candidates.some((c) => c.instanceId === cardId || c.id === cardId)
    ) {
        return false;
    }

    const remaining: Ability = {
        ...ability,
        effects: (ability.effects || []).slice(pending.effectIndex),
    };
    if (
        !applyAbilityEffect(
            G,
            site as unknown as CardState,
            remaining,
            cardId,
            undefined,
            undefined,
            playerID
        )
    ) {
        return false;
    }

    G.pendingSitePhaseDesignation = undefined;
    G.statusMessage = `${site.name || 'Le site'} : effet appliqué.`;
    // Action répétable : ré-offrir si encore légale.
    beginOptionalSitePhaseAbility(G);
    return true;
}
