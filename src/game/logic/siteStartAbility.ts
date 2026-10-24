import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { canUseAbility } from '../engine/canUseAbility';
import { abilityMatchesPhase } from '../engine/abilities/collectAbilities';
import { canPayAbilityCost } from '../engine/abilities/payAbilityCost';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import { getCurrentSite } from './sites';
import { hasActionableStartOfPhaseCards } from './hasActionableStartOfPhaseCards';
import { exitStartOf } from './phaseEntry';
import { getMusterCount } from './musterHelpers';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

function shadowPlayerId(G: GameState): string {
    const fpId = G.fpPlayerId || '0';
    return fpId === '0' ? '1' : '0';
}

function responderForAbility(G: GameState, ability: Ability): string {
    if (ability.responsePlayer === 'SHADOW') {
        return shadowPlayerId(G);
    }
    return G.fpPlayerId || '0';
}

function siteInstanceKey(site: SiteCardState): string {
    return (
        (site as SiteCardState & { instanceId?: string }).instanceId || site.id
    );
}

/** Capacité optionnelle du site courant pour ce début de phase. */
export function findOptionalSiteStartAbility(
    G: GameState,
    phaseName: string
): { site: SiteCardState; ability: Ability; playerId: string } | null {
    const site = getCurrentSite(G);
    if (!site) return null;

    for (const ability of site.abilities || []) {
        if (!ability.optional) continue;
        if (!abilityMatchesPhase(ability, phaseName)) continue;
        if (!abilityMeetsPlayRestrictions(G, site as CardState, ability)) {
            continue;
        }
        const playerId = responderForAbility(G, ability);
        const context = { G, ctx: { phase: phaseName }, playerID: playerId };
        if (!canUseAbility(site as CardState, context).valid) continue;
        if (
            !canPayAbilityCost(
                G,
                site as CardState,
                ability.cost,
                playerId
            )
        ) {
            continue;
        }
        if (
            !abilityHasLegalEffectTarget(
                G,
                site as CardState,
                ability,
                playerId
            )
        ) {
            continue;
        }
        return { site, ability, playerId };
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
    if (G.pendingSiteStartAbility) return true;
    const found = findOptionalSiteStartAbility(G, phaseName);
    if (!found) return false;
    G.pendingSiteStartAbility = {
        playerId: found.playerId,
        siteInstanceId: siteInstanceKey(found.site),
        abilityId: found.ability.id,
        phase: phaseName,
    };
    G.startOfPhaseState = undefined;
    const isShadow = found.playerId === shadowPlayerId(G);
    G.statusMessage = isShadow
        ? 'Début de regroupement : l’Ombre peut utiliser l’effet du site.'
        : 'Début de compagnie : vous pouvez utiliser l’effet du site.';
    return true;
}

/** Dual-wait classique (cartes en jeu), après le choix site ou s’il n’y en a pas. */
export function openStartOfFellowshipDualWait(
    G: GameState,
    events?: PhaseEvents
): void {
    const fpId = G.fpPlayerId || '0';
    const shadowId = shadowPlayerId(G);

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

/**
 * Suite après toaster site en début de regroupement :
 * muster (si déjà posé) + dual-wait capacités / exit.
 */
export function openStartOfRegroupDualWait(
    G: GameState,
    events?: PhaseEvents
): void {
    const fpId = G.fpPlayerId || '0';
    const shadowId = shadowPlayerId(G);

    const fpMuster = getMusterCount(G, fpId);
    const shadowMuster = getMusterCount(G, shadowId);
    const hasMusterToProcess = fpMuster > 0 || shadowMuster > 0;

    if (hasMusterToProcess && !G.musterState) {
        G.musterState = {
            players: {
                [fpId]: {
                    allowedCount: fpMuster,
                    discardedCount: 0,
                    isDone: fpMuster === 0,
                },
                [shadowId]: {
                    allowedCount: shadowMuster,
                    discardedCount: 0,
                    isDone: shadowMuster === 0,
                },
            },
        };
        G.regroupStep = 'MUSTER_STEP';
        G.actionWindow = undefined;
    }

    const fpHasCards = hasActionableStartOfPhaseCards(
        G.players[fpId],
        G,
        fpId,
        'startOfRegroup'
    );
    const shadowHasCards = hasActionableStartOfPhaseCards(
        G.players[shadowId],
        G,
        shadowId,
        'startOfRegroup'
    );

    G.startOfPhaseState = {
        players: {
            [fpId]: { isDone: !fpHasCards },
            [shadowId]: { isDone: !shadowHasCards },
        },
    };

    if (!hasMusterToProcess && !fpHasCards && !shadowHasCards) {
        G.startOfPhaseState = undefined;
        exitStartOf(events, 'regroup');
    } else if (!hasMusterToProcess) {
        G.statusMessage =
            'Phase de Regroupement : Étape initiale (Capacités).';
    }
}

function resumeAfterSiteStart(
    G: GameState,
    events?: PhaseEvents,
    phaseName?: string
): void {
    const phase = phaseName || 'startOfFellowship';
    if (phase === 'startOfRegroup') {
        openStartOfRegroupDualWait(G, events);
        return;
    }
    openStartOfFellowshipDualWait(G, events);
}

export function declinePendingSiteStartAbility(
    G: GameState,
    playerID: string,
    events?: PhaseEvents
): boolean {
    const pending = G.pendingSiteStartAbility;
    if (!pending || pending.playerId !== playerID) return false;
    const phase = pending.phase;
    G.pendingSiteStartAbility = undefined;
    resumeAfterSiteStart(G, events, phase);
    return true;
}

/**
 * Après activation réussie du site.
 * Début de regroupement (Isenwash…) : re-propose tant que l’effet reste légal
 * (plusieurs exerts possibles) ; sinon dual-wait / phase.
 * Début de fellowship : une seule offre, puis dual-wait.
 */
export function afterSiteStartAbilityResolved(
    G: GameState,
    events?: PhaseEvents
): void {
    if (!G.pendingSiteStartAbility) return;
    const phase = G.pendingSiteStartAbility.phase;
    G.pendingSiteStartAbility = undefined;

    if (
        phase === 'startOfRegroup' &&
        beginOptionalSiteStartAbility(G, 'startOfRegroup')
    ) {
        G.statusMessage =
            'Ombre : vous pouvez encore utiliser l’effet du site, ou passer.';
        return;
    }

    resumeAfterSiteStart(G, events, phase);
}
