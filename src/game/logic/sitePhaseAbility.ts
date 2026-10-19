import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { getCurrentSite } from './sites';

/**
 * Capacités de phase de site trop maladroites en projection
 * (Shores : Spot N → prevent move again).
 * Entorse UX : toaster unique dès que le spot est vrai ; Passer = plus d’offre
 * jusqu’à la prochaine phase d’Ombre. Voir sites-modern-plan / exceptions.
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

/** Capacité site Ombre → toaster (pas de bulle sur les séides). */
export function isSitePhaseToasterAbility(ability: Ability): boolean {
    const phases = (ability.phases || []).map((p) => p.toUpperCase());
    if (!phases.includes('SHADOW')) return false;
    if (ability.trigger) return false;
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

export function findOptionalSitePhaseAbility(
    G: GameState
): { site: SiteCardState; ability: Ability } | null {
    if (G.preventMoveAgain) return null;
    if (G.sitePhaseAbilityOfferedThisPhase) return null;
    if (G.pendingSitePhaseAbility) return null;

    const site = getCurrentSite(G);
    if (!site?.abilities?.length) return null;

    const shadowId = shadowPlayerId(G);
    for (const ability of site.abilities) {
        if (!isSitePhaseToasterAbility(ability)) continue;
        if (
            !canPayAbilityCost(
                G,
                site as unknown as CardState,
                ability.cost,
                shadowId
            )
        ) {
            continue;
        }
        return { site, ability };
    }
    return null;
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
    accept: boolean
): boolean {
    const pending = G.pendingSitePhaseAbility;
    if (!pending || pending.playerId !== playerID) return false;

    // Une seule offre par phase d’Ombre, Activer ou Passer.
    G.sitePhaseAbilityOfferedThisPhase = true;

    if (accept) {
        const site = getCurrentSite(G);
        const ability = site?.abilities?.find(
            (ab) => ab.id === pending.abilityId
        );
        if (
            !site ||
            !ability ||
            siteInstanceKey(site) !== pending.siteInstanceId
        ) {
            G.pendingSitePhaseAbility = undefined;
            return false;
        }
        const source = site as unknown as CardState;
        if (!canPayAbilityCost(G, source, ability.cost, playerID)) {
            G.pendingSitePhaseAbility = undefined;
            return false;
        }
        if (
            !payAbilityCost(
                G,
                source,
                ability.cost,
                undefined,
                undefined,
                undefined,
                playerID
            )
        ) {
            G.pendingSitePhaseAbility = undefined;
            return false;
        }
        if (
            !applyAbilityEffect(
                G,
                source,
                ability,
                undefined,
                undefined,
                undefined,
                playerID
            )
        ) {
            G.pendingSitePhaseAbility = undefined;
            return false;
        }
        G.statusMessage = `${site.name || 'Le site'} : effet appliqué.`;
    } else {
        G.statusMessage = 'Ombre : effet du site décliné.';
    }

    G.pendingSitePhaseAbility = undefined;
    return true;
}
