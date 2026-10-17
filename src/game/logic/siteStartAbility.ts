import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { canUseAbility } from '../engine/canUseAbility';
import { abilityMatchesPhase } from '../engine/abilities/collectAbilities';
import { canPayAbilityCost } from '../engine/abilities/payAbilityCost';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import { getCurrentSite } from './sites';
import { hasActionableStartOfPhaseCards } from './hasActionableStartOfPhaseCards';
import { exitStartOf } from './phaseEntry';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

/** Capacité optionnelle du site courant pour ce début de phase. */
export function findOptionalSiteStartAbility(
    G: GameState,
    phaseName: string
): { site: SiteCardState; ability: Ability } | null {
    const site = getCurrentSite(G);
    if (!site) return null;
    const fpId = G.fpPlayerId || '0';
    const context = { G, ctx: { phase: phaseName }, playerID: fpId };
    if (!canUseAbility(site as CardState, context).valid) return null;

    for (const ability of site.abilities || []) {
        if (!ability.optional) continue;
        if (!abilityMatchesPhase(ability, phaseName)) continue;
        if (!abilityMeetsPlayRestrictions(G, site as CardState, ability)) {
            continue;
        }
        if (!canPayAbilityCost(G, site as CardState, ability.cost)) continue;
        if (
            !abilityHasLegalEffectTarget(
                G,
                site as CardState,
                ability,
                fpId
            )
        ) {
            continue;
        }
        return { site, ability };
    }
    return null;
}

/**
 * Ouvre le toaster « Activer / Passer » pour le site courant.
 * Pas de dual-wait tant que ce choix n’est pas tranché.
 */
export function beginOptionalSiteStartAbility(
    G: GameState,
    phaseName: string
): boolean {
    const found = findOptionalSiteStartAbility(G, phaseName);
    if (!found) return false;
    const fpId = G.fpPlayerId || '0';
    const siteId =
        (found.site as SiteCardState & { instanceId?: string }).instanceId ||
        found.site.id;
    G.pendingSiteStartAbility = {
        playerId: fpId,
        siteInstanceId: siteId,
        abilityId: found.ability.id,
        phase: phaseName,
    };
    G.startOfPhaseState = undefined;
    G.statusMessage =
        'Début de compagnie : vous pouvez utiliser l’effet du site.';
    return true;
}

/** Dual-wait classique (cartes en jeu), après le choix site ou s’il n’y en a pas. */
export function openStartOfFellowshipDualWait(
    G: GameState,
    events?: PhaseEvents
): void {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    const fpDone = !hasActionableStartOfPhaseCards(
        G.players[fpId],
        G,
        fpId,
        'startOfFellowship'
    );
    const shadowDone = !hasActionableStartOfPhaseCards(
        G.players[shadowId],
        G,
        shadowId,
        'startOfFellowship'
    );

    G.startOfPhaseState = {
        players: {
            [fpId]: { isDone: fpDone },
            [shadowId]: { isDone: shadowDone },
        },
    };

    if (fpDone && shadowDone) {
        G.startOfPhaseState = undefined;
        exitStartOf(events, 'fellowship');
    } else {
        G.statusMessage =
            'Début de la phase de compagnie : Capacités spéciales.';
    }
}

export function declinePendingSiteStartAbility(
    G: GameState,
    playerID: string,
    events?: PhaseEvents
): boolean {
    const pending = G.pendingSiteStartAbility;
    if (!pending || pending.playerId !== playerID) return false;
    G.pendingSiteStartAbility = undefined;
    openStartOfFellowshipDualWait(G, events);
    return true;
}

/** Après activation réussie du site : enchaîne le dual-wait / fellowship. */
export function afterSiteStartAbilityResolved(
    G: GameState,
    events?: PhaseEvents
): void {
    if (!G.pendingSiteStartAbility) return;
    G.pendingSiteStartAbility = undefined;
    openStartOfFellowshipDualWait(G, events);
}
